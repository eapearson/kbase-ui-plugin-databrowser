
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
    'kb_types',
    'datatables_bootstrap'
],
    function ($, Promise, DOM, html, APIUtils, Utils, WorkspaceClient, Narrative, Types) {
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
                    columns = ['Object Name', 'Module', 'Type', 'Version', 'Icon', 'Narrative', 'Version', 'Last Modified'],
                    /* TODO: the workspace client should make a type object for us, but kbaseTypes is new */
                    rows = data.map(function (object) {
                        var type = {
                            module: object.info.typeModule,
                            name: object.info.typeName,
                            version: {
                                major : object.info.typeMajorVersion,                            
                                minor: object.info.typeMinorVersion
                            }
                        };
                        return [
                            a({href: '#dataview/' + object.info.wsid + '/' + object.info.id + '/' + object.info.version}, object.info.name),
                            type.module,
                            a({href: '#spec/type/' + Types.makeTypeId(type)}, type.name),
                            Types.makeVersion(type),
                            Types.getIcon({
                                type: type,
                                size: 'medium'
                            }).html,
                            a({href: '/narrative/' + object.narrative.workspaceId + '/' + object.info.id}, object.narrative.name),
                            object.info.version,
                            Utils.niceElapsedTime(object.info.save_date)
                        ]
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
                }
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

            function init(config) {
                return new Promise(function (resolve) {
                    resolve();
                });
            }

            function attach(node) {
                return new Promise(function (resolve) {
                    mount = node;

                    container = DOM.createElement('div');
                    DOM.append(mount, container);
                    DOM.setHTML(container, html.loading());

                    resolve();
                });
            }

            function start(params) {
                return new Promise(function (resolve, reject) {

                    /* DOC: rendering
                     * Here we have a simple rendering implementation!
                     */
                    // DOM.setHTML(container, 'Hi, I am a very simple minded widget.');

                    getData()
                        .then(function (data) {
                            var rendered = render(data);
                            DOM.setHTML(container, rendered.content);
                            if (rendered.afterAttach) {
                                rendered.afterAttach();
                            }
                            resolve();
                        })
                        .catch(function (err) {
                            reject(err);
                        })
                        .done();
                });
            }

            function run(params) {
                return new Promise(function (resolve) {
                    DOM.setHTML(container, 'Hi, it is now ' + (new Date()));
                    resolve();
                });
            }

            function stop() {
                return new Promise(function (resolve) {
                    resolve();
                });
            }

            function detach() {
                return new Promise(function (resolve) {
                    DOM.remove(mount, container);
                    resolve();
                });
            }

            function destroy() {
                return new Promise(function (resolve) {
                    resolve();
                });
            }

            return {
                init: init,
                attach: attach,
                start: start,
                run: run,
                stop: stop,
                detach: detach,
                destroy: destroy
            };
        };

        return {
            make: function (config) {
                return widget(config);
            }
        };
    }
);