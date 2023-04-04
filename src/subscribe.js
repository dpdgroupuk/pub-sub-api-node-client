import { EventEmitter } from 'events';

import { parseEvent, encodeReplayId, decodeReplayId } from './eventParser.js';

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
     * PubSubApiClient
     * @type {Object}
     */
    #parent;

    lastReceivedEvent;
    lastReplayId;
    pendingEvents;

    /**
     * Builds a new Pub/Sub API client
     * @param {PubSubApiClient} parent an optional custom logger. The client uses the console if no value is supplied.
     */
    constructor(parent) {
        this.#parent = parent;
    }

    async subscribe(subscribeRequest) {
        try {
            if (!this.#parent.client) {
                throw new Error('Pub/Sub API client is not connected.');
            }
            const schema = await this.#parent.getEventSchema(
                subscribeRequest.topicName
            );

            const subscription = this.#parent.client.Subscribe();
            subscription.write(subscribeRequest);
            this.#parent.logger.info(
                `Subscribe request sent for ${subscribeRequest.numRequested} events from ${subscribeRequest.topicName}...`
            );

            this.pendingEvents = subscribeRequest.numRequested;
            this.lastReceivedEvent = Date.now();

            setInterval(() => {
                const now = Date.now();
                const diffInSeconds = (now - this.lastReceivedEvent) / 1000;

                if (diffInSeconds > 50 && this.pendingEvents == 0) {
                    subscription.write({
                        ...subscribeRequest,
                        replayId: encodeReplayId(this.lastReplayId)
                    });

                    this.pendingEvents = subscribeRequest.numRequested;
                    this.lastReceivedEvent = now;

                    this.#parent.logger.debug(
                        `Resubscribe request sent for ${subscribeRequest.numRequested} events from ${subscribeRequest.topicName} due to inactivity...`
                    );
                }
            }, 1000 * 10); // every 10 seconds

            // Listen to new events
            const eventEmitter = new EventEmitter();
            subscription.on('data', (data) => {
                if (data.events) {
                    const latestReplayId = decodeReplayId(data.latestReplayId);
                    this.lastReplayId = latestReplayId;
                    this.lastReceivedEvent = Date.now();
                    this.#parent.logger.info(
                        `Received ${data.events.length} events, latest replay ID: ${latestReplayId}`
                    );
                    data.events.forEach((event) => {
                        const parsedEvent = parseEvent(schema, event);
                        this.#parent.logger.debug(parsedEvent);
                        eventEmitter.emit('data', parsedEvent);
                    });

                    this.pendingEvents -= data.events.length;
                } else {
                    // If there are no events then every 270 seconds the system will keep publishing the latestReplayId.
                }
            });
            subscription.on('end', () => {
                this.#parent.logger.info('gRPC stream ended');
                eventEmitter.emit('end');
            });
            subscription.on('error', (error) => {
                this.#parent.logger.error(
                    `gRPC stream error: ${JSON.stringify(error)}`
                );
                eventEmitter.emit('error', error);
            });
            subscription.on('status', (status) => {
                this.#parent.logger.info(
                    `gRPC stream status: ${JSON.stringify(status)}`
                );
                eventEmitter.emit('status', status);
            });
            return eventEmitter;
        } catch (error) {
            throw new Error(
                `Failed to subscribe to events for topic ${subscribeRequest.topicName}`,
                { cause: error }
            );
        }
    }
}
