/* global CONTEXT_PATH define NodeFilter setTimeout window */
define([ 'jquery', 'bsp-utils' ], function($, bsp_utils) {

    var PEEK_WIDTH = 99,
    win = window,
    $win = $(win),
    doc = win.document,
    $doc = $(doc),
    $body = $(doc.body),

    $edit = $('.content-edit'),
    $publishingExtra = $('.widget-publishingExtra-left'),
    $previewAction,
    appendPreviewAction,
    removePreviewAction,

    $preview = $('.contentPreview'),
    $previewWidget = $preview.find('.widget-preview'),
    $previewHeading = $preview.find('h1'),
    showPreview,
    previewEventsBound,
    hidePreview,
    previewData = window.PREVIEW_DATA || {},

    getUniqueColor,
    fieldHue = Math.random(),
    GOLDEN_RATIO = 0.618033988749895;

    if ($edit.closest('.popup').length > 0) {
        return;
    }

    // Append a link for activating the preview.
    appendPreviewAction = function() {
        $previewAction = $('<li/>', {
            'html': $('<a/>', {
                'class': 'action-preview',
                'href': '#',
                'text': 'Preview',
                'click': function() {
                    removePreviewAction();
                    showPreview();
                    $previewHeading.click();
                    return false;
                }
            })
        });

        $publishingExtra.append($previewAction);
    };

    removePreviewAction = function() {
        $previewAction.remove();
        $previewAction = null;
    };

    // Show a peekable preview widget.
    showPreview = function() {
        var $previewForm = $('#' + previewData.formId),
        $contentForm = $('.contentForm'),
        action = win.location.href,
        questionAt = action.indexOf('?'),
        oldFormData,
        loadPreview;

        $previewWidget.addClass('widget-loading');
        $preview.show();

        $edit.css({
            'max-width': 1100
        });

        if (!previewEventsBound) {
            $preview.append($('<span/>', {
                'class': 'contentPreviewClose',
                'text': 'Close',
                'click': function() {
                    hidePreview();
                    return false;
                }
            }));

            // Preview should be roughly the same width as the window.
            $win.resize($.throttle(500, function() {
                if (!$preview.is(':visible')) {
                    return;
                }

                var $toolHeader = $('.toolHeader');

                $preview.css('width', '');
                $edit.css('margin-right', $preview.outerWidth(true));

                var $widgetWidth = $win.width() - PEEK_WIDTH;
                var $widgetControls = $('.widget-preview_controls');

                $widgetControls.width($widgetWidth - 60);
                $('.widget-previewFrameContainer').css('top', $widgetControls.outerHeight(true) + 40);
                $preview.css({
                    top: $toolHeader.offset().top + $toolHeader.outerHeight() - $win.scrollTop(),
                    width: $previewWidget.is('.widget-expanded')
                    ? $widgetWidth
                    : $win.width() - $edit.offset().left - $edit.outerWidth() + 10
                });
            }));

            // Make the preview expand/collapse when the heading is clicked.
            $previewHeading.click(function() {
                // $edit.find('.inputContainer').trigger('fieldPreview-disable');

                if ($previewWidget.is('.widget-expanded')) {
                    $('.queryField_frames').show();
                    $previewWidget.removeClass('widget-expanded');
                    $preview.animate({ 'width': $win.width() - $edit.offset().left - $edit.outerWidth() + 10 }, 300, 'easeOutBack');

                    $.ajax({
                        'type': 'post',
                        'url': CONTEXT_PATH + '/misc/updateUserSettings',
                        'data': 'action=liveContentPreview-enable'
                    });

                } else {
                    $('.queryField_frames').hide();
                    $previewWidget.addClass('widget-expanded');
                    $preview.animate({ 'width': $win.width() - PEEK_WIDTH }, 300, 'easeOutBack');

                    // $edit.find('.inputContainer').trigger('fieldPreview-enable');
                }
            });

            previewEventsBound = true;
        }

        $win.resize();

        // Load the preview.
        loadPreview = $.throttle(2000, function() {
            if (!$preview.is(':visible')) {
                return;
            }

            var newFormData = $contentForm.serialize();

            // If the form inputs haven't changed, try again later.
            if (oldFormData === newFormData) {
                setTimeout(loadPreview, 100);
                return;
            }

            oldFormData = newFormData;
            $previewWidget.addClass('widget-loading');

            // Get the correct JSON from the server.
            $.ajax({
                'data': newFormData,
                'type': 'post',
                'url': CONTEXT_PATH + 'content/state.jsp?id=' + previewData.stateId + '&' + (questionAt > -1 ? action.substring(questionAt + 1) : ''),
                'complete': function(request) {
                    var $previewTarget;

                    // Make sure that the preview IFRAME exists.
                    $(':input[name=' + previewData.objectParameter + ']').val(request.responseText);
                    $previewTarget = $('iframe[name=' + previewData.target + ']');

                    if ($previewTarget.length === 0) {
                        $previewTarget = $('<iframe/>', {
                            'name': previewData.target,
                            'css': {
                                'width': $previewForm.find('select.deviceWidthSelect').val() || '100%'
                            }
                        });

                        var $container = $('<div/>', {
                            'class': 'widget-previewFrameContainer',
                            'html': $previewTarget
                        });

                        $previewWidget.append($container);

                        var resizePreview = function() {
                            var deviceWidth = parseInt($previewForm.find('select.deviceWidthSelect').val(), 10);
                            var scale = ($win.width() - 160) / deviceWidth;

                            if (scale > 1) {
                                scale = 1;
                            }

                            $previewTarget.css({
                                height: ($win.height() - ($container.offset().top - $win.scrollTop()) - 40) / scale,
                                transform: 'scale(' + scale + ')'
                            });
                        }

                        resizePreview();
                        $win.resize($.throttle(500, resizePreview));
                    }

                    $previewTarget.load(function() {
                        $previewWidget.removeClass('widget-loading');
                    });

                    // Really load the preview.
                    $previewForm.submit();
                    setTimeout(loadPreview, 100);
                }
            });
        });

        loadPreview();
    };

    hidePreview = function() {
        if ($previewWidget.is('.widget-expanded')) {
            $previewHeading.click();
        }

        // $edit.find('.inputContainer').trigger('fieldPreview-hide');
        $edit.css({
            'max-width': '',
            'margin-right': ''
        });

        appendPreviewAction();
        $preview.hide();
        $win.resize();

        $.ajax({
            'type': 'post',
            'url': CONTEXT_PATH + '/misc/updateUserSettings',
            'data': 'action=liveContentPreview-disable'
        });
    };

    if (previewData.live) {
        var previewInterval = window.setInterval(function() {

            var $form = $('#' + previewData.formId);

            if ($form.size() > 0 && $form.find('input[name="_csrf"]').size() > 0) {
                window.clearInterval(previewInterval);
                showPreview();
            }
        }, 200);
    } else {
        appendPreviewAction();
    }
    // Per-field preview.
    getUniqueColor = function($container) {
        var color = $.data($container[0], 'fieldPreview-color');

        if (!color) {
            fieldHue += GOLDEN_RATIO;
            fieldHue %= 1.0;
            color = 'hsl(' + (fieldHue * 360) + ', 50%, 50%)';
            $.data($container[0], 'fieldPreview-color', color);
        }

        return color;
    };

    $edit.delegate('.contentForm-main .inputContainer', 'mouseenter', function() {
        var $container = $(this),
        $toggle = $.data($container[0], 'fieldPreview-$toggle');

        if ($preview.is(':visible')) {
            if (!$toggle) {
                $toggle = $('<span/>', {
                    'class': 'fieldPreviewToggle'
                });

                $.data($container[0], 'fieldPreview-$toggle', $toggle);
                $container.append($toggle);
            }

        } else if ($toggle) {
            $toggle.remove();
        }
    });

    $edit.delegate('.contentForm-main .inputContainer .fieldPreviewToggle', 'click', function() {
        var $toggle = $(this),
        $container = $toggle.closest('.inputContainer');

        $container.find('> .inputLabel').trigger('fieldPreview-toggle', [ $toggle ]);
        $toggle.css('color', $container.is('.fieldPreview-displaying') ? getUniqueColor($container) : '');
    });

    $edit.delegate('.contentForm-main .inputContainer', 'fieldPreview-enable', function() {
        $(this).addClass('fieldPreview-enabled');
    });

    $edit.delegate('.contentForm-main .inputContainer', 'fieldPreview-disable', function() {
        $(this).trigger('fieldPreview-hide').removeClass('fieldPreview-enabled');
    });

    $edit.delegate('.contentForm-main .inputContainer', 'fieldPreview-hide', function() {
        var $container = $(this),
        name = $container.attr('data-name');

        $container.removeClass('fieldPreview-displaying');
        $container.find('> .inputLabel').css({
            'background-color': '',
            'color': ''
        });

        $('.fieldPreviewTarget[data-name="' + name + '"]').remove();
        $('.fieldPreviewPaths[data-name="' + name + '"]').remove();
    });

    $edit.delegate('.contentForm-main .inputContainer', 'fieldPreview-toggle', function(event, $source) {
        var $container = $(this),
        name = $container.attr('data-name'),
        color,

        $frame,
        frameOffset,
        frameWindowScrollTop,

        $paths,
        pathsCanvas;

        event.stopPropagation();

        if ($container.is('.fieldPreview-displaying')) {
            $container.trigger('fieldPreview-hide');
            return;
        }

        color = getUniqueColor($container);

        $frame = $preview.find('iframe');
        frameOffset = $frame.offset();
        frameWindowScrollTop = $($frame[0].contentWindow).scrollTop();

        $container.addClass('fieldPreview-displaying');
        $container.find('> .inputLabel').css({
            'background-color': color,
            'color': 'white'
        });

        // Draw arrows between the label and the previews.
        $paths = $('<canvas/>', {
            'class': 'fieldPreviewPaths',
            'data-name': name,
            'css': {
                'left': 0,
                'pointer-events': 'none',
                'position': 'absolute',
                'top': 0,
                'z-index': 5
            }
        });

        // For browsers that don't support pointer-events.
        $paths.click(function() {
            $edit.find('.inputContainer').trigger('fieldPreview-hide');
        });

        $paths.attr({
            'width': $doc.width(),
            'height': $doc.height()
        });

        $body.append($paths);

        pathsCanvas = $paths[0].getContext('2d');

        var PLACEHOLDER_PREFIX = 'BrightspotCmsFieldAccess ';
        var frameDocument = $frame[0].contentDocument;
        var frameCommentWalker = frameDocument.createTreeWalker(frameDocument.body, NodeFilter.SHOW_COMMENT, null, null);

        while (frameCommentWalker.nextNode()) {
            var placeholder = frameCommentWalker.currentNode;
            var placeholderValue = placeholder.nodeValue;

            if (placeholderValue.indexOf(PLACEHOLDER_PREFIX) !== 0) {
                continue;
            }

            var placeholderData = $.parseJSON(placeholderValue.substring(PLACEHOLDER_PREFIX.length));
            var placeholderName = placeholderData.id + '/' + placeholderData.name;

            if (placeholderName !== name) {
                continue;
            }

            var $placeholder = $(frameCommentWalker.currentNode),
            $target,
            targetOffset,
            pathSourceX, pathSourceY, pathSourceDirection,
            pathTargetX, pathTargetY, pathTargetDirection,
            sourceOffset,
            isBackReference = false,
            pathSourceControlX,
            pathSourceControlY,
            pathTargetControlX,
            pathTargetControlY;

            if ($placeholder.parent().is('body')) {
                continue;
            }

            $target = $placeholder.nextAll(':visible:first');

            if ($target.length === 0) {
                $target = $placeholder.parent();
            }

            if ($target.find('> * [data-name="' + name + '"]').length > 0) {
                continue;
            }

            targetOffset = $target.offset();

            $body.append($('<span/>', {
                'class': 'fieldPreviewTarget',
                'data-name': name,
                'css': {
                    'outline-color': color,
                    'height': $target.outerHeight(),
                    'left': frameOffset.left + targetOffset.left,
                    'position': 'absolute',
                    'top': frameOffset.top + targetOffset.top - frameWindowScrollTop,
                    'width': $target.outerWidth()
                }
            }));

            if (!$source) {
                $source = $container.find('> .inputLabel');
            }

            sourceOffset = $source.offset();
            targetOffset = $target.offset();
            targetOffset.left += frameOffset.left;
            targetOffset.top += frameOffset.top;

            if (sourceOffset.left > targetOffset.left) {
                var targetWidth = $target.outerWidth();
                pathTargetX = targetOffset.left + targetWidth + 3;
                pathTargetY = targetOffset.top + $target.outerHeight() / 2;
                isBackReference = true;

                if (targetOffset.left + targetWidth > sourceOffset.left) {
                    pathSourceX = sourceOffset.left + $source.width();
                    pathSourceY = sourceOffset.top + $source.height() / 2;
                    pathSourceDirection = 1;
                    pathTargetDirection = 1;

                } else {
                    pathSourceX = sourceOffset.left;
                    pathSourceY = sourceOffset.top + $source.height() / 2;
                    pathSourceDirection = -1;
                    pathTargetDirection = 1;
                }

            } else {
                pathSourceX = sourceOffset.left + $source.width();
                pathSourceY = sourceOffset.top + $source.height() / 2;
                pathTargetX = targetOffset.left - 3;
                pathTargetY = targetOffset.top + $target.height() / 2;
                pathSourceDirection = 1;
                pathTargetDirection = -1;
            }

            pathTargetY -= frameWindowScrollTop;
            pathSourceControlX = pathSourceX + pathSourceDirection * 100;
            pathSourceControlY = pathSourceY;
            pathTargetControlX = pathTargetX + pathTargetDirection * 100;
            pathTargetControlY = pathTargetY;

            pathsCanvas.strokeStyle = color;
            pathsCanvas.fillStyle = color;

            // Reference curve.
            pathsCanvas.lineWidth = isBackReference ? 0.4 : 1.0;
            pathsCanvas.beginPath();
            pathsCanvas.moveTo(pathSourceX, pathSourceY);
            pathsCanvas.bezierCurveTo(pathSourceControlX, pathSourceControlY, pathTargetControlX, pathTargetControlY, pathTargetX, pathTargetY);
            pathsCanvas.stroke();

            // Arrow head.
            var arrowSize = pathTargetX > pathTargetControlX ? 5 : -5;
            if (isBackReference) {
                arrowSize *= 0.8;
            }
            pathsCanvas.beginPath();
            pathsCanvas.moveTo(pathTargetX, pathTargetY);
            pathsCanvas.lineTo(pathTargetX - 2 * arrowSize, pathTargetY - arrowSize);
            pathsCanvas.lineTo(pathTargetX - 2 * arrowSize, pathTargetY + arrowSize);
            pathsCanvas.closePath();
            pathsCanvas.fill();
        }
    });

    $edit.delegate('.contentForm-main .inputContainer', 'click', function() {
        if ($previewWidget.is('.widget-expanded')) {
            $(this).trigger('fieldPreview-toggle');
            return false;

        } else {
            return true;
        }
    });

});
