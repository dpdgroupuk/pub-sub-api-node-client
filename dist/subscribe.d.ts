/**
 * @typedef {Object} Schema
 * @property {string} id
 * @property {Object} type
 */
/**
 * @typedef {Object} PublishResult
 * @property {number} replayId
 * @property {string} correlationKey
 */
/**
 * @typedef {Object} Logger
 * @property {Function} debug
 * @property {Function} info
 * @property {Function} error
 */
/**
 * Client for the Salesforce Pub/Sub API
 */
export default class Subscription {
    /**
     * Builds a new Pub/Sub API client
     * @param {PubSubApiClient} parent an optional custom logger. The client uses the console if no value is supplied.
     */
    constructor(parent: PubSubApiClient);
    lastReceivedEvent: any;
    lastReplayId: any;
    pendingEvents: any;
    subscribe(subscribeRequest: any): Promise<EventEmitter>;
    #private;
}
export type Schema = {
    id: string;
    type: any;
};
export type PublishResult = {
    replayId: number;
    correlationKey: string;
};
export type Logger = {
    debug: Function;
    info: Function;
    error: Function;
};
import { EventEmitter } from "events";
//# sourceMappingURL=subscribe.d.ts.map