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
        owner: {
            gender: 'male',
        },
    }, {
        id: 3,
        type: 'cat',
        name: 'Snowball',
        owner: {
            gender: 'female',
        },
    }, {
        id: 4,
        type: 'dog',
        name: 'Terry',
        owner: {
            gender: 'male',
        },
    }, {
        id: 7,
        type: 'cat',
        name: 'Jewel',
        owner: {
            gender: 'male',
        },
    }, {
        id: 8,
        type: 'dog',
        name: 'Buzz',
        owner: {
            gender: 'female',
        },
    }];

    const additionalRecords = [{
        id: 9,
        type: 'dog',
        name: 'Tatum',
        owner: {
            gender: 'female',
        },
    }, {
        id: 11,
        type: 'cat',
        name: 'Jason',
        owner: {
            gender: 'male',
        },
    }, {
        id: 13,
        type: 'dog',
        name: 'Red',
        owner: {
            gender: 'male',
        },
    }];

    const checkRecords = function (apiHistory, expectedRecords, indices) {
        const { length } = expectedRecords;
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

        const expectedClients = indices.map((index) => _.omit(expectedRecords[index], 'id'));
        expect(apiHistory.listClients()).to.deep.equal(expectedClients);

        const expectedServers = indices.map((index) => expectedRecords[index]);
        expect(apiHistory.listServers()).to.deep.equal(expectedServers);

        const fieldLimitedServers = expectedServers.map((record) => _.omit(record, 'type', 'owner'));
        expect(apiHistory.listServers(['id', 'name'])).to.deep.equal(fieldLimitedServers);

        const testIndices = indices.filter((na, index) => index !== 0);

        expectedServers.splice(0, 1);
        expect(apiHistory.listServers(null, testIndices)).to.deep.equal(expectedServers);

        fieldLimitedServers.splice(0, 1);
        expect(apiHistory.listServers(['id', 'name'], testIndices)).to.deep.equal(fieldLimitedServers);
    };

    const newAPIHistory = function () {
        const apiHistory = new APIHistory();
        records.forEach((record) => {
            const { id, ...client } = _.cloneDeep(record);
            apiHistory.pushWithId(client, id);
        });
        return apiHistory;
    };

    const getRecordsWithExtraFields = function (originalRecords) {
        return originalRecords.map((record, index) => {
            const extendedRecord = {
                fieldstr1: `fieldStr1_${index}`,
                fieldstr2: `fieldStr2_${index}`,
                fieldint: index,
                ...record,
            };
            return extendedRecord;
        });
    };

    it('push', function push() {
        const apiHistory = new APIHistory();
        records.forEach((record) => {
            const client = _.omit(record, ['id']);
            const server = _.cloneDeep(record);
            apiHistory.push(client, server);
        });
        checkRecords(apiHistory, records, [0, 1, 2, 3, 4]);
    });

    it('pushWithId', function pushWithId() {
        const apiHistory = newAPIHistory();
        checkRecords(apiHistory, records, [0, 1, 2, 3, 4]);
    });

    it('remove', function remove() {
        const apiHistory = newAPIHistory();

        const indices = [0, 1, 2, 3, 4];
        [[1, 1], [2, 1], [3, 1], [0, 0]].forEach(([index, currentIndex]) => {
            apiHistory.remove(index);
            indices.splice(currentIndex, 1);
            checkRecords(apiHistory, records, indices);
        });
    });

    it('replace', function replace() {
        const apiHistory = newAPIHistory();

        const indexMovement = [[1, 1], [4, 3]];
        const expectedRecords = _.cloneDeep(records);
        const indices = [0, 1, 2, 3, 4];
        additionalRecords.slice(0, 2).forEach((record, index) => {
            const client = _.omit(record, 'id');
            const [removeIndex, currentRemoveIndex] = indexMovement[index];
            apiHistory.replace(removeIndex, client, _.cloneDeep(record));
            indices.splice(currentRemoveIndex, 1);
            expectedRecords.push(record);
            indices.push(5 + index);
            checkRecords(apiHistory, expectedRecords, indices);
        });
    });

    it('listServers', function listServers() {
        const testRecords = getRecordsWithExtraFields(records);

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
                delete testRecord.owner;
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
                delete testRecord.owner;
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

    it('updateClient and updateServer', function updateClientAndUpdateServer() {
        const apiHistory = newAPIHistory();

        apiHistory.updateClient(1, _.omit(additionalRecords[0], 'id'));
        apiHistory.updateClient(3, _.omit(additionalRecords[1], 'id'));

        const expectedRecords = [];
        expectedRecords.push(records[0]);
        expectedRecords.push(additionalRecords[0]);
        expectedRecords.push(records[2]);
        expectedRecords.push(additionalRecords[1]);
        expectedRecords.push(records[4]);

        const expectedClients = expectedRecords.map((r) => _.omit(r, 'id'));
        expect(apiHistory.listClients()).to.deep.equal(expectedClients);

        apiHistory.updateServer(1, additionalRecords[0]);
        apiHistory.updateServer(3, additionalRecords[1]);

        checkRecords(apiHistory, expectedRecords, [0, 1, 2, 3, 4]);

        apiHistory.updateClient(4, _.omit(additionalRecords[2], 'id'));
        expectedClients[4] = _.omit(additionalRecords[2], 'id');
        expect(apiHistory.listClients()).to.deep.equal(expectedClients);

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

        const id0 = records[2].id;
        const id1 = additionalRecords[0].id;
        const update0 = { ...records[4], id: id0 };
        const update1 = { ...additionalRecords[2], id: id1 };
        apiHistory.reloadServer(update0);
        apiHistory.reloadServer(update1);

        expectedRecords[2] = { ...records[4], id: id0 };
        expectedRecords[4] = { ...additionalRecords[2], id: id1 };

        checkRecords(apiHistory, expectedRecords, [0, 1, 2, 3, 4, 5]);

        apiHistory.remove(1);
        apiHistory.remove(4);
        checkRecords(apiHistory, expectedRecords, [0, 2, 3, 5]);
    });

    const translations = {
        sp: {
            dog: 'perro',
            cat: 'cato',
            female: 'mujer',
            male: 'masculino',
        },
        tr: {
            dog: 'köpek',
            cat: 'kedi',
            female: 'dişi',
            male: 'erkek',
        },
    };

    const translationSp = [{
        type: translations.sp.dog,
        owner: {
            gender: translations.sp.male,
        },
    }, {
        type: translations.sp.cat,
        owner: {
            gender: translations.sp.female,
        },
    }, {}, {
        owner: {
            gender: translations.sp.male,
        },
    }, {
        type: translations.sp.dog,
    }];

    const translationTr = [{}, {
        type: translations.tr.cat,
        owner: {
            gender: translations.tr.female,
        },
    }, {
        type: translations.tr.dog,
    }, {
        type: translations.tr.cat,
        owner: {
            gender: translations.tr.male,
        },
    }, {
        owner: {
            gender: translations.tr.female,
        },
    }];

    const expectedRecordsSp = [{
        id: 1,
        type: translations.sp.dog,
        name: 'Russell',
        owner: {
            gender: translations.sp.male,
        },
    }, {
        id: 3,
        type: translations.sp.cat,
        name: 'Snowball',
        owner: {
            gender: translations.sp.female,
        },
    }, {
        id: 4,
        type: 'dog',
        name: 'Terry',
        owner: {
            gender: 'male',
        },
    }, {
        id: 7,
        type: 'cat',
        name: 'Jewel',
        owner: {
            gender: translations.sp.male,
        },
    }, {
        id: 8,
        type: translations.sp.dog,
        name: 'Buzz',
        owner: {
            gender: 'female',
        },
    }];

    const expectedRecordsTr = [{
        id: 1,
        type: 'dog',
        name: 'Russell',
        owner: {
            gender: 'male',
        },
    }, {
        id: 3,
        type: translations.tr.cat,
        name: 'Snowball',
        owner: {
            gender: translations.tr.female,
        },
    }, {
        id: 4,
        type: translations.tr.dog,
        name: 'Terry',
        owner: {
            gender: 'male',
        },
    }, {
        id: 7,
        type: translations.tr.cat,
        name: 'Jewel',
        owner: {
            gender: translations.tr.male,
        },
    }, {
        id: 8,
        type: 'dog',
        name: 'Buzz',
        owner: {
            gender: translations.tr.female,
        },
    }];

    it('translate', function translate() {
        const apiHistory = newAPIHistory();

        translationSp.forEach((translation, index) => {
            if (!_.isEmpty(translation)) {
                apiHistory.translate(index, 'sp', translation);
            }
        });

        translationTr.forEach((translation, index) => {
            if (!_.isEmpty(translation)) {
                apiHistory.translate(index, 'tr', translation);
            }
        });

        checkRecords(apiHistory, records, [0, 1, 2, 3, 4]);

        records.forEach((record, index) => {
            const serverSp = apiHistory.translatedServer(index, 'sp');
            expect(serverSp).to.deep.equal(expectedRecordsSp[index]);
            const serverTr = apiHistory.translatedServer(index, 'tr');
            expect(serverTr).to.deep.equal(expectedRecordsTr[index]);
            const serverFr = apiHistory.translatedServer(index, 'fr');
            expect(serverFr).to.deep.equal(records[index]);
        });

        records.forEach((record, index) => {
            const serverSp = apiHistory.serverTranslation(record.id, 'sp');
            expect(serverSp).to.deep.equal(expectedRecordsSp[index]);
            const serverTr = apiHistory.serverTranslation(record.id, 'tr');
            expect(serverTr).to.deep.equal(expectedRecordsTr[index]);
            const serverFr = apiHistory.serverTranslation(record.id, 'fr');
            expect(serverFr).to.deep.equal(records[index]);
        });

        expect(apiHistory.translatedHistory('sp')).to.deep.equal(expectedRecordsSp);
        expect(apiHistory.translatedHistory('tr')).to.deep.equal(expectedRecordsTr);
        expect(apiHistory.translatedHistory('fr')).to.deep.equal(records);

        const testRecords = records.map((record) => {
            const testRecord = _.cloneDeep(record);
            return _.omit(testRecord, 'name');
        });
        const testRecordsSp = expectedRecordsSp.map((record) => {
            const testRecord = _.cloneDeep(record);
            return _.omit(testRecord, 'name');
        });
        const testRecordsTr = expectedRecordsTr.map((record) => {
            const testRecord = _.cloneDeep(record);
            return _.omit(testRecord, 'name');
        });

        const includeFields = ['id', 'owner', 'type'];
        expect(apiHistory.listTranslatedServers('sp', includeFields)).to.deep.equal(testRecordsSp);
        expect(apiHistory.listTranslatedServers('tr', includeFields)).to.deep.equal(testRecordsTr);
        expect(apiHistory.listTranslatedServers('fr', includeFields)).to.deep.equal(testRecords);
    });

    it('translateServer', function translateServer() {
        const testRecords = getRecordsWithExtraFields(records);
        const testRecordsSp = getRecordsWithExtraFields(expectedRecordsSp);
        const testRecordsTr = getRecordsWithExtraFields(expectedRecordsTr);

        const apiHistory = new APIHistory(['type', 'owner', 'fieldint']);
        testRecords.forEach((record) => {
            const { id, ...client } = _.cloneDeep(record);
            apiHistory.pushWithId(client, id);
        });

        translationSp.forEach((translation, index) => {
            if (!_.isEmpty(translation)) {
                apiHistory.translateWithServer(testRecords[index], 'sp', translation);
            }
        });

        translationTr.forEach((translation, index) => {
            if (!_.isEmpty(translation)) {
                apiHistory.translateWithServer(testRecords[index], 'tr', translation);
            }
        });

        testRecords.forEach((record, index) => {
            const serverSp = apiHistory.translatedServer(index, 'sp');
            expect(serverSp).to.deep.equal(testRecordsSp[index]);
            const serverTr = apiHistory.translatedServer(index, 'tr');
            expect(serverTr).to.deep.equal(testRecordsTr[index]);
            const serverFr = apiHistory.translatedServer(index, 'fr');
            expect(serverFr).to.deep.equal(testRecords[index]);
        });

        testRecords.forEach((record, index) => {
            const serverSp = apiHistory.serverTranslation(record.id, 'sp');
            expect(serverSp).to.deep.equal(testRecordsSp[index]);
            const serverTr = apiHistory.serverTranslation(record.id, 'tr');
            expect(serverTr).to.deep.equal(testRecordsTr[index]);
            const serverFr = apiHistory.serverTranslation(record.id, 'fr');
            expect(serverFr).to.deep.equal(testRecords[index]);
        });

        expect(apiHistory.translatedHistory('sp')).to.deep.equal(testRecordsSp);
        expect(apiHistory.translatedHistory('tr')).to.deep.equal(testRecordsTr);
        expect(apiHistory.translatedHistory('fr')).to.deep.equal(testRecords);

        {
            const expectedRecords = testRecords.map((record) => {
                const testRecord = _.cloneDeep(record);
                return _.omit(testRecord, ['fieldstr1', 'name', 'fieldstr2', 'id']);
            });
            const expectedRecords2Sp = testRecordsSp.map((record) => {
                const testRecord = _.cloneDeep(record);
                return _.omit(testRecord, ['fieldstr1', 'name', 'fieldstr2', 'id']);
            });
            const expectedRecords2Tr = testRecordsTr.map((record) => {
                const testRecord = _.cloneDeep(record);
                return _.omit(testRecord, ['fieldstr1', 'name', 'fieldstr2', 'id']);
            });

            expect(apiHistory.listTranslatedServers('sp')).to.deep.equal(expectedRecords2Sp);
            expect(apiHistory.listTranslatedServers('tr')).to.deep.equal(expectedRecords2Tr);
            expect(apiHistory.listTranslatedServers('fr')).to.deep.equal(expectedRecords);
        }

        {
            const expectedRecords = testRecords.map((record) => {
                const testRecord = _.cloneDeep(record);
                return _.omit(testRecord, ['fieldstr1', 'name', 'fieldstr2', 'fieldint']);
            });
            const expectedRecords2Sp = testRecordsSp.map((record) => {
                const testRecord = _.cloneDeep(record);
                return _.omit(testRecord, ['fieldstr1', 'name', 'fieldstr2', 'fieldint']);
            });
            const expectedRecords2Tr = testRecordsTr.map((record) => {
                const testRecord = _.cloneDeep(record);
                return _.omit(testRecord, ['fieldstr1', 'name', 'fieldstr2', 'fieldint']);
            });

            const includeFields = ['id', 'type', 'owner'];
            expect(apiHistory.listTranslatedServers('sp', includeFields)).to.deep.equal(expectedRecords2Sp);
            expect(apiHistory.listTranslatedServers('tr', includeFields)).to.deep.equal(expectedRecords2Tr);
            expect(apiHistory.listTranslatedServers('fr', includeFields)).to.deep.equal(expectedRecords);
        }
    });

    it('pushRemoveHook', function pushRemoveHook() {
        const apiHistory = newAPIHistory();

        const store = { lastIndex: -1 };
        apiHistory.pushRemoveHook((index) => {
            store.lastIndex = index;
        });

        [1, 2, 3, 0].forEach((index) => {
            expect(store.lastIndex).not.equal(index);
            apiHistory.remove(index);
            expect(store.lastIndex).equal(index);
        });
    });
});
