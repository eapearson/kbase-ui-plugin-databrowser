/*global
 define, require
 */
/*jslint
 white: true
 */
define([
    'promise',
    'kb/common/html',
    'kb/common/dom',
    'kb/widget/widgetSet'
],
    function (Promise, html, DOM, WidgetSet) {
        'use strict';

        function widget(config) {
            var mount, container, runtime = config.runtime,
                widgetSet = WidgetSet.make({runtime: runtime}),
                div = html.tag('div');

            function render() {
                return {
                    title: 'Data Browser',
                    content: div({class: 'kb-panel-databrowser container-fluid'}, [
                        div({class: 'row'}, [
                            div({class: 'col-md-12'}, [
                                html.bsPanel('Data Browser Widget', div({id: widgetSet.addWidget('databrowser_widget')}))
                            ])
                        ])
                    ])
                };
            }

            var rendered = render();

            // Widget API
            function init() {
                 return Promise.try(function () {
                    return widgetSet.init(config);
                });
            }
            function attach(node) {
                return Promise.try(function () {
                    mount = node;
                    container = DOM.createElement('div');
                    mount.appendChild(container);
                    container.innerHTML = html.flatten(rendered.content);
                    runtime.send('ui', 'setTitle', rendered.title);
                    return widgetSet.attach(node);
                });
            }
            function detach() {
                return Promise.try(function () {
                    mount.removeChild(container);
                    container = null;
                    return widgetSet.detach();
                });
            }
            function start(params) {
                return Promise.try(function () {
                    return widgetSet.start(params);
                });
            }
            function run(params) {
                return Promise.try(function () {
                    return widgetSet.run(params);
                });
            }
            function stop() {
                return Promise.try(function () {
                    return widgetSet.stop();
                });
            }
            function destroy() {
                return Promise.try(function () {
                    return widgetSet.destroy();
                });
            }

            return {
                init: init,
                attach: attach,
                detach: detach,
                start: start,
                run: run,
                stop: stop,
                destroy: destroy
            };
        }

        return {
            make: function (config) {
                return widget(config);
            }
        };
    });