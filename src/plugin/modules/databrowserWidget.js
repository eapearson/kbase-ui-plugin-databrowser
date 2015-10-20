
/*global
 define
 */
/*jslint
 browser: true,
 white: true
 */

define([
    'jquery',
    'promise',
    'kb_common_dom',
    'kb_common_html',
    'kb_common_apiUtils',
    'kb_common_utils',
    'kb_service_workspace',
    'kb_narrative',
    'datatables_bootstrap'
],
    function ($, Promise, DOM, html, APIUtils, Utils, WorkspaceClient, Narrative) {
        'use strict';

        var widget = function (config) {
            var mount, container, runtime = config.runtime;
            var workspaceClient = new WorkspaceClient(runtime.getConfig('services.workspace.url'), {
                token: runtime.getService('session').getAuthToken()
            });

            var workspaceObjects;

            function render(data) {
                var a = html.tag('a'),
                    tableId = html.genId(),
                    columns = ['Object Name', 'Module', 'Type', 'Version', 'Icon', 'Lineage', 'Narrative', 'Version', 'Last Modified'],
                    /* TODO: the workspace client should make a type object for us, but kbaseTypes is new */
                    rows = data.map(function (object) {
                        var type = {
                            module: object.info.typeModule,
                            name: object.info.typeName,
                            version: {
                                major: object.info.typeMajorVersion,
                                minor: object.info.typeMinorVersion
                            }
                        },
                        objectRef = object.info.wsid + '/' + object.info.id + '/' + object.info.version;
                        return [
                            a({href: '#dataview/' + objectRef}, object.info.name),
                            type.module,
                            a({href: '#spec/type/' + runtime.service('types').makeTypeId(type)}, type.name),
                            runtime.service('types').makeVersion(type),
                            runtime.service('types').getIcon({
                                type: type,
                                size: 'medium'
                            }).html,
                            a({href: '#taxontest/lineage/' + objectRef}, 'Lineage'),
                            a({href: '/narrative/' + object.narrative.workspaceId + '/' + object.info.id}, object.narrative.name),
                            object.info.version,
                            Utils.niceElapsedTime(object.info.save_date)
                        ];
                    });

                return {
                    content: html.makeTable({
                        columns: columns,
                        rows: rows,
                        classes: ['table', 'table-striped'],
                        id: tableId
                    }),
                    afterAttach: function () {
                        $('#' + tableId).dataTable();
                    }
                };
            }

            function getData() {
                return new Promise(function (resolve, reject) {
                    Promise.resolve(workspaceClient.list_workspace_info({
                        showDeleted: 0,
                        excludeGlobal: 0
                            // owners: [runtime.getService('session').getUsername()]
                    }))
                        .then(function (data) {
                            var workspaceList = [],
                                workspaceDb = {}, i, wsInfo;
                            for (i = 0; i < data.length; i += 1) {
                                wsInfo = APIUtils.workspace_metadata_to_object(data[i]);

                                //if (Narrative.isValid(wsInfo)) {
                                workspaceList.push(wsInfo.id);
                                workspaceDb[wsInfo.id] = wsInfo;
                                //}
                            }

                            // We should now have the list of recently active narratives.
                            // Now we sort and limit the list.
                            // Now get the workspace details.
                            Promise.resolve(workspaceClient.list_objects({
                                ids: workspaceList,
                                includeMetadata: 1
                            }))
                                .then(function (data) {
                                    workspaceObjects = data.map(function (info) {
                                        var wsObjectInfo = APIUtils.object_info_to_object(info);
                                        return {
                                            info: wsObjectInfo,
                                            narrative: {
                                                workspaceId: wsObjectInfo.wsid,
                                                name: workspaceDb[wsObjectInfo.wsid].metadata.narrative_nice_name || 'not a narrative'
                                            }
                                        };
                                    });
                                    resolve(workspaceObjects);
                                })
                                .catch(function (err) {
                                    console.log('ERROR');
                                    console.log(err);
                                    reject(err);
                                })
                                .done();
                        })
                        .catch(function (err) {
                            console.log('ERROR');
                            console.log(err);
                            reject(err);
                        })
                        .done();
                });
            }

            function attach(node) {
                return Promise.try(function () {
                    mount = node;

                    container = DOM.createElement('div');
                    DOM.append(mount, container);
                    DOM.setHTML(container, html.loading());
                });
            }

            function start(params) {
                return Promise.try(function () {
                    // nothing really to do ...                    
                });
            }

            function run(params) {
                return Promise.try(function () {
                    DOM.setHTML(container, 'Loading data ... ' + html.loading());
                    return getData()
                        .then(function (data) {
                            var rendered = render(data);
                            DOM.setHTML(container, rendered.content);
                            if (rendered.afterAttach) {
                                rendered.afterAttach();
                            }
                        });
                });
            }

            function stop() {
                return Promise.try(function () {
                    // nothing really to do ...
                });
            }

            function detach() {
                return Promise.try(function () {
                    mount.removeChild(container);
                });
            }

            return {
                attach: attach,
                start: start,
                run: run,
                stop: stop,
                detach: detach
            };
        };

        return {
            make: function (config) {
                return widget(config);
            }
        };
    }
);