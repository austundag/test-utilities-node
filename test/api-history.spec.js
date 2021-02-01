/* global describe, it */

import _ from 'lodash';
import chai from 'chai';

import APIHistory from '../lib/api-history.js'; 

const { expect } = chai;

describe('api-history unit tests', function apiHistoryUnit() {
    const records = [{
        id: 1,
        type: 'dog',
        name: 'Russell',
    }, {
        id: 3,
        type: 'cat',
        name: 'Snowball',
    }, {
        id: 4,
        type: 'dog',
        name: 'Terry',
    }, {
        id: 7,
        type: 'cat',
        name: 'Jewel',
    }, {
        id: 8,
        type: 'dog',
        name: 'Buzz',
    }];

    const additionalRecords = [{
        id: 9,
        type: 'dog',
        name: 'Tatum',
    }, {
        id: 11,
        type: 'cat',
        name: 'Jason',
    }, {
        id: 13,
        type: 'dog',
        name: 'Red',
    }];

    const checkRecords = function (apiHistory, expectedRecords, indices) {
        const length = expectedRecords.length;
        const last = expectedRecords[length - 1];
 
        expect(apiHistory.length()).to.equal(length);
        expect(apiHistory.lastId()).to.equal(last.id);
        expect(apiHistory.lastServer()).to.deep.equal(last);
        expect(apiHistory.lastIndex()).to.equal(length - 1);

        indices.forEach((index) => {
            const expectedRecord = expectedRecords[index];
            const client = apiHistory.client(index);
            const expectedClient = _.omit(expectedRecord, ['id']);
            expect(expectedClient).to.deep.equal(client);

            const server = apiHistory.server(index);
            expect(server).to.deep.equal(expectedRecord);

            const { id } = expectedRecord;
            const serverById = apiHistory.serverById(id);
            expect(serverById).to.deep.equal(expectedRecord);
        });

        const expectedClients = indices.map(index => _.omit(expectedRecords[index], 'id'));
        expect(apiHistory.listClients()).to.deep.equal(expectedClients);

        const expectedServers = indices.map(index => expectedRecords[index]);
        expect(apiHistory.listServers()).to.deep.equal(expectedServers);

        const fieldLimitedServers = expectedServers.map(record => _.omit(record, 'type'));
        expect(apiHistory.listServers(['id', 'name'])).to.deep.equal(fieldLimitedServers);

        const testIndices = indices.filter((na, index) => index !== 0);

        expectedServers.splice(0, 1);
        expect(apiHistory.listServers(null, testIndices)).to.deep.equal(expectedServers);

        fieldLimitedServers.splice(0, 1);
        expect(apiHistory.listServers(['id', 'name'], testIndices)).to.deep.equal(fieldLimitedServers);
    };

    it('push', function push() {
        const apiHistory = new APIHistory();
        records.forEach((record, index) => {
            const client = _.omit(record, ['id']);
            const server = _.cloneDeep(record);
            apiHistory.push(client, server);
        });
        checkRecords(apiHistory, records, [0, 1, 2, 3, 4]);
    });

    it('pushWithId', function pushWithId() {
        const apiHistory = new APIHistory();
        records.forEach((record, index) => {
            const { id, ...client } = _.cloneDeep(record);
            apiHistory.pushWithId(client, id);
        });
        checkRecords(apiHistory, records, [0, 1, 2, 3, 4]);
    });

    it('remove', function remove() {
        const apiHistory = new APIHistory();
        records.forEach((record) => {
            const { id, ...client } = _.cloneDeep(record);
            apiHistory.pushWithId(client, id);
        });

        const indices = [0, 1, 2, 3, 4];
        [[1, 1], [2, 1], [3, 1], [0, 0]].forEach(([index, currentIndex]) => {
            apiHistory.remove(index);
            indices.splice(currentIndex, 1);
            checkRecords(apiHistory, records, indices);
        });
    });

    it('replace', function remove() {
        const apiHistory = new APIHistory();
        records.forEach((record) => {
            const { id, ...client } = _.cloneDeep(record);
            apiHistory.pushWithId(client, id);
        });

        const indexMovement = [[1, 1], [4, 3]];
        const expectedRecords = _.cloneDeep(records);
        const indices = [0, 1, 2, 3, 4];
        additionalRecords.slice(0, 2).forEach((record, index) => {
            const { id, ...client } = _.cloneDeep(record);
            const [removeIndex, currentRemoveIndex] = indexMovement[index];
            apiHistory.replace(removeIndex, client, _.cloneDeep(record));
            indices.splice(currentRemoveIndex, 1);
            expectedRecords.push(record);
            indices.push(5 + index);
            checkRecords(apiHistory, expectedRecords, indices);
        });
    });

    it('listServers', function listServers() {
        const testRecords = records.map((record, index) => {
            const testRecord = Object.assign({
                fieldstr1: `fieldStr1_${index}`,
                fieldstr2: `fieldStr2_${index}`,
                fieldint: index,
            }, record);
            return testRecord;
       })

        const apiHistory = new APIHistory(['name', 'fieldstr1', 'fieldint']);
        testRecords.forEach((record) => {
            const { id, ...client } = _.cloneDeep(record);
            apiHistory.pushWithId(client, id);
        });

        {
            const expectedRecords = testRecords.map((record) => {
                const testRecord = _.cloneDeep(record);
                delete testRecord.fieldstr2;
                delete testRecord.id;
                delete testRecord.type;
                return testRecord;
            });

            const actualRecords = apiHistory.listServers();
            expect(actualRecords).to.deep.equal(expectedRecords);

            expectedRecords.splice(1, 1);
            expectedRecords.splice(2, 1);
            const fielteredActualRecords = apiHistory.listServers(null, [0, 2, 4]);
            expect(fielteredActualRecords).to.deep.equal(expectedRecords);
        }

        {
            const expectedRecords = testRecords.map((record) => {
                const testRecord = _.cloneDeep(record);
                delete testRecord.fieldstr1;
                delete testRecord.type;
                return testRecord;
            });

            const actualRecords = apiHistory.listServers(['id', 'name', 'fieldstr2', 'fieldint']);
            expect(actualRecords).to.deep.equal(expectedRecords);

            expectedRecords.splice(1, 1);
            expectedRecords.splice(2, 1);
            const fielteredActualRecords = apiHistory.listServers(['id', 'name', 'fieldstr2', 'fieldint'], [0, 2, 4]);
            expect(fielteredActualRecords).to.deep.equal(expectedRecords);
        }
    });

    it('updateClient and updateServer', function updateClient() {
        const apiHistory = new APIHistory();
        records.forEach((record) => {
            const { id, ...client } = _.cloneDeep(record);
            apiHistory.pushWithId(client, id);
        });

        apiHistory.updateClient(1, _.omit(additionalRecords[0], 'id'));
        apiHistory.updateClient(3, _.omit(additionalRecords[1], 'id'));

        const expectedRecords = [];
        expectedRecords.push(records[0]);
        expectedRecords.push(additionalRecords[0]);
        expectedRecords.push(records[2]);
        expectedRecords.push(additionalRecords[1]);
        expectedRecords.push(records[4]);

        const expectedClients = expectedRecords.map(r =>  _.omit(r, 'id'));
        expect(apiHistory.listClients()).to.deep.equal(expectedClients)

        apiHistory.updateServer(1, additionalRecords[0]);
        apiHistory.updateServer(3, additionalRecords[1]);

        checkRecords(apiHistory, expectedRecords, [0, 1, 2, 3, 4]);

        apiHistory.updateClient(4, _.omit(additionalRecords[2], 'id'));
        expectedClients[4] = _.omit(additionalRecords[2], 'id');
        expect(apiHistory.listClients()).to.deep.equal(expectedClients)

        apiHistory.updateLastServer(additionalRecords[2]);
        expectedRecords[4] = additionalRecords[2];

        checkRecords(apiHistory, expectedRecords, [0, 1, 2, 3, 4]);

        apiHistory.remove(0);
        apiHistory.remove(4);
        checkRecords(apiHistory, expectedRecords, [1, 2, 3]);
    });

    it('reloadServer', function reloadServer() {
        const apiHistory = new APIHistory();
        const expectedRecords = [...records.slice(0, 4), ...additionalRecords.slice(0, 2)];
        expectedRecords.forEach((record) => {
            const { id, ...client } = _.cloneDeep(record);
            apiHistory.pushWithId(client, id);
        });

        apiHistory.updateClient(2, _.omit(records[4], 'id'));
        apiHistory.updateClient(4, _.omit(additionalRecords[2], 'id'));

        const id_0 = records[2].id;
        const id_1 = additionalRecords[0].id;
        const update_0 = Object.assign({}, records[4], { id: id_0 });
        const update_1 = Object.assign({}, additionalRecords[2], { id: id_1 });
        apiHistory.reloadServer(update_0);
        apiHistory.reloadServer(update_1);

        expectedRecords[2] = Object.assign({}, records[4], { id: id_0 });
        expectedRecords[4] = Object.assign({}, additionalRecords[2], { id: id_1 });

        checkRecords(apiHistory, expectedRecords, [0, 1, 2, 3, 4, 5]);

        apiHistory.remove(1);
        apiHistory.remove(4);
        checkRecords(apiHistory, expectedRecords, [0, 2, 3, 5]);
    });
});
