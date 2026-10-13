(function () {
    'use strict';

    angular
        .module('app')
        .constant('tinymceConfig', {
            menubar: false,
            branding: false,
            statusbar: true,
            elementpath: false,
            plugins: 'advlist autolink lists link table paste autoresize code hr charmap',
            toolbar: 'undo redo | formatselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link hr | removeformat code',
            block_formats: 'Párrafo=p;Título 1=h1;Título 2=h2;Título 3=h3',
            table_default_attributes: {
                border: '1'
            },
            table_default_styles: {
                'width': '100%',
                'border-collapse': 'collapse'
            },
            paste_data_images: false,
            min_height: 220,
            autoresize_bottom_margin: 20,
            content_style: "body { font-family: 'Open Sans', Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.35; color: #222; margin: 10px; } p { margin: 0 0 6px 0; } table { width: 100%; border-collapse: collapse; margin-bottom: 8px; } td, th { border: 1px solid #BDBDBD; padding: 4px; }"
        })
        .directive('ngTinymce', ngTinymceDirective)
        .directive('ngSimditor', ngTinymceDirective);

    /** @ngInject */
    function ngTinymceDirective($timeout, tinymceConfig) {
        var idCounter = 0;

        return {
            restrict: 'EA',
            scope: {
                content: '=',
                disabled: '='
            },
            template: '<textarea></textarea>',
            replace: true,
            link: function ($scope, iElm) {
                var uniqueId = 'tinymce_editor_' + (++idCounter);
                iElm.attr('id', uniqueId);

                function initTinyMCE() {
                    if (!window.tinymce) {
                        $timeout(initTinyMCE, 100);
                        return;
                    }

                    if (!window.tinymce.baseURL) {
                        window.tinymce.baseURL = window.location.origin + '/lib/tinymce';
                    }

                    var options = angular.extend({}, tinymceConfig, {
                        target: iElm[0],
                        setup: function (editor) {
                            editor.on('init', function () {
                                if (angular.isDefined($scope.content) && $scope.content !== null) {
                                    editor.setContent($scope.content);
                                }
                                if (angular.isDefined($scope.disabled)) {
                                    editor.setMode($scope.disabled ? 'readonly' : 'design');
                                }
                            });

                            var updateModel = function () {
                                var val = editor.getContent();
                                if ($scope.content !== val) {
                                    $timeout(function () {
                                        $scope.content = val;
                                    });
                                }
                            };

                            editor.on('change input undo redo SetContent', updateModel);

                            editor.on('focus', function () {
                                angular.element(iElm).closest('.formly-field-editorTexto').addClass('active-editor');
                            });

                            editor.on('blur', function () {
                                updateModel();
                                $timeout(function () {
                                    angular.element(iElm).closest('.formly-field-editorTexto').removeClass('active-editor');
                                }, 150);
                            });
                        }
                    });

                    window.tinymce.init(options);
                }

                $timeout(initTinyMCE);

                $scope.$watch('content', function (newVal, oldVal) {
                    if (newVal !== oldVal && window.tinymce) {
                        var editor = window.tinymce.get(uniqueId);
                        if (editor && editor.initialized && newVal !== editor.getContent()) {
                            editor.setContent(newVal || '');
                        }
                    }
                });

                $scope.$watch('disabled', function (newVal) {
                    if (angular.isDefined(newVal) && window.tinymce) {
                        var editor = window.tinymce.get(uniqueId);
                        if (editor && editor.initialized) {
                            editor.setMode(newVal ? 'readonly' : 'design');
                        }
                    }
                });

                $scope.$on('$destroy', function () {
                    if (window.tinymce) {
                        var editor = window.tinymce.get(uniqueId);
                        if (editor) {
                            editor.destroy();
                        }
                    }
                });
            }
        };
    }
})();
