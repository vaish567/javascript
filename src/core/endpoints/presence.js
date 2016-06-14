/* @flow */

import Networking from '../components/networking';
import SubscriptionManager from '../components/subscription_manager';
import Config from '../components/config';
import Logger from '../components/logger';
import Responders from '../presenters/responders';
import BaseEndoint from './base.js';
import { endpointDefinition, statusStruct } from '../flow_interfaces';

type presenceConstruct = {
  networking: Networking,
  config: Config,
  subscriptionManager: SubscriptionManager
};

type hereNowArguments = {
  channels: Array<string>,
  channelGroups: Array<string>,
  includeUUIDs: boolean,
  includeState: boolean
}

type whereNowArguments = {
  uuid: string,
}

type whereNowResponse = {
  channels: Array<string>,
}

//

type getStateArguments = {
  uuid: string,
  channels: Array<string>,
  channelGroups: Array<string>
}

type getStateResponse = {
  channels: Object
}

//

type setStateArguments = {
  channels: Array<string>,
  channelGroups: Array<string>,
  state: Object
}

type setStateResponse = {
  state: Object
}

type leaveArguments = {
  channels: Array<string>,
  channelGroups: Array<string>,
}

type heartbeatArguments = {
  channels: Array<string>,
  channelGroups: Array<string>,
  state: Object
}

export default class extends BaseEndoint {
  networking: Networking;
  config: Config;
  _r: Responders;
  _l: Logger;

  constructor({ networking, config, subscriptionManager }: presenceConstruct) {
    super({ config });
    this.networking = networking;
    this.config = config;
    this.subscriptionManager = subscriptionManager;
    this._r = new Responders('#endpoints/presence');
    this._l = Logger.getLogger('#endpoints/presence');
  }

  whereNow(args: whereNowArguments, callback: Function) {
    let { uuid = this.config.UUID } = args;
    const endpointConfig: endpointDefinition = {
      params: {
        uuid: { required: false },
        authKey: { required: false }
      },
      url: '/v2/presence/sub-key/' + this.config.subscribeKey + '/uuid/' + uuid
    };

    if (!callback) {
      return this._l.error('Missing Callback');
    }

    // validate this request and return false if stuff is missing
    if (!this.validateEndpointConfig(endpointConfig)) { return; }

    // create base params
    const params = this.createBaseParams(endpointConfig);

    this.networking.GET(params, endpointConfig, (status: statusStruct, payload: Object) => {
      if (status.error) return callback(status);

      let response: whereNowResponse = {
        channels: payload.payload.channels
      };

      callback(status, response);
    });
  }

  getState(args: getStateArguments, callback: Function) {
    let { uuid = this.config.UUID, channels = [], channelGroups = [] } = args;
    let stringifiedChannels = channels.length > 0 ? channels.join(',') : ',';
    const endpointConfig: endpointDefinition = {
      params: {
        uuid: { required: false },
        authKey: { required: false }
      },
      url: '/v2/presence/sub-key/' + this.config.subscribeKey + '/channel/' + stringifiedChannels + '/uuid/' + uuid
    };

    if (!callback) {
      return this._l.error('Missing Callback');
    }

    if (channels.length === 0 && channelGroups.length === 0) {
      return callback(this._r.validationError('Channel or Channel Group must be supplied'));
    }

    // validate this request and return false if stuff is missing
    if (!this.validateEndpointConfig(endpointConfig)) { return; }

    // create base params
    const params = this.createBaseParams(endpointConfig);

    if (channelGroups.length > 0) {
      params['channel-group'] = channelGroups.join(',');
    }

    this.networking.GET(params, endpointConfig, (status: statusStruct, payload: Object) => {
      if (status.error) return callback(status);

      let channelsResponse = {};

      if (channels.length === 1 && channelGroups.length === 0) {
        channelsResponse[channels[0]] = payload.payload;
      } else {
        channelsResponse = payload.payload;
      }

      let response: getStateResponse = {
        channels: channelsResponse
      };

      callback(status, response);
    });
  }

  setState(args: setStateArguments, callback: Function) {
    let { state, channels = [], channelGroups = [] } = args;
    let stringifiedChannels = channels.length > 0 ? channels.join(',') : ',';
    const endpointConfig: endpointDefinition = {
      params: {
        uuid: { required: false },
        authKey: { required: false }
      },
      url: '/v2/presence/sub-key/' + this.config.subscribeKey + '/channel/' + stringifiedChannels + '/uuid/' + this.config.UUID + '/data'
    };

    if (!callback) {
      return this._l.error('Missing Callback');
    }

    if (channels.length === 0 && channelGroups.length === 0) {
      return callback(this._r.validationError('Channel or Channel Group must be supplied'));
    }

    if (!state) {
      return callback(this._r.validationError('State must be supplied'));
    }

    // validate this request and return false if stuff is missing
    if (!this.validateEndpointConfig(endpointConfig)) { return; }

    // create base params
    const params = this.createBaseParams(endpointConfig);

    params.state = encodeURIComponent(JSON.stringify(state));

    if (channelGroups.length > 0) {
      params['channel-group'] = channelGroups.join(',');
    }

    this.networking.GET(params, endpointConfig, (status: statusStruct, payload: Object) => {
      if (status.error) return callback(status);

      let response: setStateResponse = {
        state: payload.payload
      };

      callback(status, response);
    });
  }

  leave(args: leaveArguments, callback: Function) {
    let { channels = [], channelGroups = [] } = args;
    let stringifiedChannels = channels.length > 0 ? channels.join(',') : ',';
    const endpointConfig: endpointDefinition = {
      params: {
        uuid: { required: false },
        authKey: { required: false }
      },
      url: '/v2/presence/sub-key/' + this.config.subscribeKey + '/channel/' + encodeURIComponent(stringifiedChannels) + '/leave'
    };

    // validate this request and return false if stuff is missing
    if (!this.validateEndpointConfig(endpointConfig)) { return; }

    // create base params
    const params = this.createBaseParams(endpointConfig);

    if (channelGroups.length > 0) {
      params['channel-group'] = encodeURIComponent(channelGroups.join(','));
    }

    this.networking.GET(params, endpointConfig, (status: statusStruct) =>
      callback(status)
    );
  }

  hereNow(args: hereNowArguments, callback: Function) {
    let { channels = [], channelGroups = [], includeUUIDs = true, includeState = false } = args;
    const endpointConfig: endpointDefinition = {
      params: {
        uuid: { required: false },
        authKey: { required: false }
      },
      url: '/v2/presence/sub-key/' + this.config.subscribeKey
    };

    if (channels.length > 0 || channelGroups.length > 0) {
      let stringifiedChannels = channels.length > 0 ? channels.join(',') : ',';
      endpointConfig.url += '/channel/' + encodeURIComponent(stringifiedChannels);
    }

    // validate this request and return false if stuff is missing
    if (!this.validateEndpointConfig(endpointConfig)) { return; }

    // create base params
    const params = this.createBaseParams(endpointConfig);

    if (!includeUUIDs) params.disable_uuids = 1;
    if (includeState) params.state = 1;

    // Make sure we have a Channel
    if (!callback) {
      return this._l.error('Missing Callback');
    }

    if (channelGroups.length > 0) {
      params['channel-group'] = channelGroups.join(',');
    }

    this.networking.GET(params, endpointConfig, (status: statusStruct, payload) => {
      if (status.error) return callback(status);

      let prepareSingularChannel = () => {
        let response = {};
        let occupantsList = [];
        response.totalChannels = 1;
        response.totalOccupancy = payload.occupancy;
        response.channels = {};
        response.channels[channels[0]] = {
          occupants: occupantsList,
          name: channels[0],
          occupancy: payload.occupancy
        };

        if (includeUUIDs) {
          payload.uuids.forEach((uuidEntry) => {
            if (includeState) {
              occupantsList.push({ state: uuidEntry.state, uuid: uuidEntry.uuid });
            } else {
              occupantsList.push({ state: null, uuid: uuidEntry });
            }
          });
        }

        return response;
      };

      let prepareMultipleChannel = () => {
        let response = {};
        response.totalChannels = payload.payload.total_channels;
        response.totalOccupancy = payload.payload.total_occupancy;
        response.channels = {};

        Object.keys(payload.payload.channels).forEach((channelName) => {
          let channelEntry = payload.payload.channels[channelName];
          let occupantsList = [];
          response.channels[channelName] = {
            occupants: occupantsList,
            name: channelName,
            occupancy: channelEntry.occupancy
          };

          if (includeUUIDs) {
            channelEntry.uuids.forEach((uuidEntry) => {
              if (includeState) {
                occupantsList.push({ state: uuidEntry.state, uuid: uuidEntry.uuid });
              } else {
                occupantsList.push({ state: null, uuid: uuidEntry });
              }
            });
          }

          return response;
        });

        return response;
      };

      let response;
      if (channels.length > 1 || channelGroups.length > 0) {
        response = prepareMultipleChannel();
      } else {
        response = prepareSingularChannel();
      }

      callback(status, response);
    });
  }

  heartbeat(args: heartbeatArguments, callback: Function) {
    let { channels = [], channelGroups = [], state = {} } = args;
    let stringifiedChannels = channels.length > 0 ? channels.join(',') : ',';
    const endpointConfig: endpointDefinition = {
      params: {
        uuid: { required: false },
        authKey: { required: false }
      },
      url: '/v2/presence/sub-key/' + this.config.subscribeKey + '/channel/' + encodeURIComponent(stringifiedChannels) + '/heartbeat'
    };

    // validate this request and return false if stuff is missing
    if (!this.validateEndpointConfig(endpointConfig)) { return; }

    // create base params
    const params = this.createBaseParams(endpointConfig);

    if (channelGroups.length > 0) {
      params['channel-group'] = encodeURIComponent(channelGroups.join(','));
    }

    params.state = encodeURIComponent(JSON.stringify(state));
    params.heartbeat = this.config.getPresenceTimeout();

    this.networking.GET(params, endpointConfig, (status: statusStruct) =>
      callback(status)
    );
  }

}
