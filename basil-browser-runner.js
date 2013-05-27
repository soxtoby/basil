(function (global) {
    "use strict";

    function extend(constructor, subPrototype) {
        var prototype = Object.create(constructor.prototype);
        Object.keys(subPrototype).forEach(function (key) {
            prototype[key] = subPrototype[key];
        });

        return prototype;
    }

    function BrowserRunner() {
        Basil.TestRunner.call(this);
        this.registerPlugin({ setup: this._onRootTestRun.bind(this) });
    }

    BrowserRunner.prototype = extend(Basil.TestRunner, {
        start: function () {
            this._renderPage();
            Basil.TestRunner.prototype.start.call(this);
        },

        _renderPage: function () {
            var header = appendElement(document.body, 'div', {
                id: 'basil-header'
            });

            var results = this._resultsElement = appendElement(document.body, 'div', {
                id: 'basil-results'
            });

            this.runPluginQueue('pageRender', this, [header, results]);
        },

        _onRootTestRun: function (runTest, test) {
            runTest();

            clearTimeout(this._completedTimeout);
            this._completedTimeout = setTimeout(this._complete.bind(this), 10);

            if (test.isComplete())
                this._appendResults(this._resultsElement, [test]);
        },

        _appendResults: function (el, tests) {
            tests = tests.filter(function (t) { return !t.wasSkipped(); });

            if (!tests.length)
                return;

            var ul = document.createElement('ul');
            tests.forEach(function (test, i) {
                var li = this._createTestElement(test);
                this._appendResults(li, test.children());
                ul.appendChild(li);
            }, this);

            el.appendChild(ul);
        },

        _createTestElement: function (test) {
            var li = document.createElement('li');

            this.runPluginQueue('testRender', this, [li, test]);

            return li;
        },

        _complete: function () {
            this.runPluginQueue('onComplete');
        }
    });

    Basil.BrowserRunner = BrowserRunner;

    Basil.domFixturePlugin = function () {
        return {
            setup: function (runTest) {
                var domElement = null;

                Object.defineProperty(this, 'dom', {
                    get: function () {
                        if (domElement != null)
                            return domElement;

                        return domElement = appendElement(document.body, 'div', {
                            id: 'basil-temporary-dom-element',
                            className: 'basil-temporary-dom-element'
                        });
                    }
                });

                runTest();

                if (domElement)
                    document.body.removeChild(domElement);
            }
        };
    };

    Basil.testCountPlugin = function (testRunner) {
        return {
            setup: function (runTest) {
                runTest();

                var counts = testRunner.testCounts = {
                    passed: 0,
                    failed: 0,
                    total: 0
                };

                testRunner.tests().forEach(countLeaves);

                function countLeaves(test) {
                    var children = test.children();
                    if (children.length)
                        return children.forEach(countLeaves);

                    counts.total++;
                    if (test.isComplete()) {
                        if (test.hasPassed())
                            counts.passed++;
                        else
                            counts.failed++;
                    }
                }
            }
        };
    };

    Basil.headerStatePlugin = function (testRunner) {
        var headerElement;

        return {
            pageRender: function (header) {
                headerElement = header;
                addClass(header, 'is-running');
            },

            onComplete: function () {
                var stateClass = testRunner.testCounts.failed ? 'is-failed' : '';
                removeClass(headerElement, 'is-running');
                addClass(headerElement, stateClass);
            }
        };
    };

    Basil.bigTitlePlugin = function (location) {
        return {
            pageRender: function (header) {
                appendElement(header, 'a', {
                    id: 'basil-title',
                    className: 'basil-header-section',
                    href: location.href.replace(location.search, ''),
                    innerText: document.title || 'Basil'
                });
            }
        };
    };

    Basil.favIconPlugin = function () {
        var failedIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAHdSURBVDjLpZNraxpBFIb3a0ggISmmNISWXmOboKihxpgUNGWNSpvaS6RpKL3Ry//Mh1wgf6PElaCyzq67O09nVjdVlJbSDy8Lw77PmfecMwZg/I/GDw3DCo8HCkZl/RlgGA0e3Yfv7+DbAfLrW+SXOvLTG+SHV/gPbuMZRnsyIDL/OASziMxkkKkUQTJJsLaGn8/iHz6nd+8mQv87Ahg2H9Th/BxZqxEkEgSrq/iVCvLsDK9awtvfxb2zjD2ARID+lVVlbabTgWYTv1rFL5fBUtHbbeTJCb3EQ3ovCnRC6xAgzJtOE+ztheYIEkqbFaS3vY2zuIj77AmtYYDusPy8/zuvunJkDKXM7tYWTiyGWFjAqeQnAD6+7ueNx/FLpRGAru7mcoj5ebqzszil7DggeF/DX1nBN82rzPqrzbRayIsLhJqMPT2N83Sdy2GApwFqRN7jFPL0tF+10cDd3MTZ2AjNUkGCoyO6y9cRxfQowFUbpufr1ct4ZoHg+Dg067zduTmEbq4yi/UkYidDe+kaTcP4ObJIajksPd/eyx3c+N2rvPbMDPbUFPZSLKzcGjKPrbJaDsu+dQO3msfZzeGY2TCvKGYQhdSYeeJjUt21dIcjXQ7U7Kv599f4j/oF55W4g/2e3b8AAAAASUVORK5CYII=';
        var passedIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAKfSURBVDjLpZPrS1NhHMf9O3bOdmwDCWREIYKEUHsVJBI7mg3FvCxL09290jZj2EyLMnJexkgpLbPUanNOberU5taUMnHZUULMvelCtWF0sW/n7MVMEiN64AsPD8/n83uucQDi/id/DBT4Dolypw/qsz0pTMbj/WHpiDgsdSUyUmeiPt2+V7SrIM+bSss8ySGdR4abQQv6lrui6VxsRonrGCS9VEjSQ9E7CtiqdOZ4UuTqnBHO1X7YXl6Daa4yGq7vWO1D40wVDtj4kWQbn94myPGkCDPdSesczE2sCZShwl8CzcwZ6NiUs6n2nYX99T1cnKqA2EKui6+TwphA5k4yqMayopU5mANV3lNQTBdCMVUA9VQh3GuDMHiVcLCS3J4jSLhCGmKCjBEx0xlshjXYhApfMZRP5CyYD+UkG08+xt+4wLVQZA1tzxthm2tEfD3JxARH7QkbD1ZuozaggdZbxK5kAIsf5qGaKMTY2lAU/rH5HW3PLsEwUYy+YCcERmIjJpDcpzb6l7th9KtQ69fi09ePUej9l7cx2DJbD7UrG3r3afQHOyCo+V3QQzE35pvQvnAZukk5zL5qRL59jsKbPzdheXoBZc4saFhBS6AO7V4zqCpiawuptwQG+UAa7Ct3UT0hh9p9EnXT5Vh6t4C22QaUDh6HwnECOmcO7K+6kW49DKqS2DrEZCtfuI+9GrNHg4fMHVSO5kE7nAPVkAxKBxcOzsajpS4Yh4ohUPPWKTUh3PaQEptIOr6BiJjcZXCwktaAGfrRIpwblqOV3YKdhfXOIvBLeREWpnd8ynsaSJoyESFphwTtfjN6X1jRO2+FxWtCWksqBApeiFIR9K6fiTpPiigDoadqCEag5YUFKl6Yrciw0VOlhOivv/Ff8wtn0KzlebrUYwAAAABJRU5ErkJggg==';
        var runningPassedIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAIMSURBVBgZpcHNi05xGMfhz/07hzTDiKZmEmLYeM3iKTKUiFhY2EhZ2NjIBgsWYoUoSWr+B7NhY6GkJBRhYSMvJYRSFDPPi3N+9/01Z2Jvcl0mif9h+46PH92yrXXpe0f9EhCBIvBwFCIUyJ2QkDsewcDsuv3y5adTN67sHytbo61rs+b0p6E5zER/u+PXgLGyUyt1vk8yU91aiSmlXJw/uJKZOnzxPY1SChpVdgQohAcEIkJ4BJ6FZ+EKKhfLh+fh4TRKJBqWDJNQMmTCwkjJMEuYOVaIIhJlFo3ITiN5OI0EmBmWjCIZqTAsQZFgVlFw/tZuTt/cjIqaRnjQSAoxzYxGApIZKRlFYRQGKcGvXLF4cBXHxjdS5R4RTqOMcP4yM6ZJnLy+DSlTRabKmUULVrJqeCMTvTZ7x0ZYoKs0ylzXTDPDAEmYGTkqdq45hCvwcALx+cdH1i0eZbLq8qx7iPXnDswv5UGjAMQUM5Do5QpX8P7bG+rI5Kipvebnrwk2LNnKZN3h8bsH38qI4C8DjClm9HKP7JmhgaXkcFzBlx8fWDh3mOcfH/L47Qs6Tsv2HR8fH1qyaH+4Ex64OxHBz8Ej9KqKKip6uWLF4Go2jezi6YdH3H/1hGXdE7fvXD6zxyTxL9aeS+3W0u19917f/VQFOz5f0CummCT+xchZa3sUfd3wka8X9I4/fgON+TR7PCxMcAAAAABJRU5ErkJggg==';
        var runningFailedIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB90CBw0qMMQJoV8AAAIRSURBVDjLpZNPSFRRFMZ/575RLMsIJCU0UIwwN0EDVhYYQtjChYskaBH92UQrIYiI2lRSUC0E19FSiKBFELg1ixYt2khUSI4tFSxnnHnvnnNavBnbKl344HI4/M73ce8Rd+d/joxPzt48PVx8slbxVnfADDdDTXFzzA1XxdxxVdSMtuasvLj46/br5xMzheJQcbqppTV0tOxocGu5otPATKGSeaisbezY+mbmAaDg6jy61LdjwPXHP8kBbgCkUXHAzVEDwzFz1AyNnsuNVJ2ezr2oaQ6g/goSBHHHg+DiiAkhCCIBEUUSJ7FAIeb9FnNAaJACICJIEJIghESQAEmApiRhbuwCb8+O4kmWAzR3Htzq/0BkCxQkn54kQiIQAsQ0pb3/MG9OjhCrNawRoXGh7gAAd14Nj+HRsJgRY8b+vh46B49TLW8w0zuAXp3KATHLthwI4O6ICJZmDFy+iJtiquDOemmFrqFB0s0yx57d4OHUlX0Fr2dJAG9EcSemNdyU1W8/sJhhWYZmGbU/v+k+c4qsUmZpfn61YGb/ItSFCLFaRWOk7VAXphE3Y325xJ7OA5Tef+D7l88oWpTxydnZju6DE6aKqaGqmBknXtwiTWtYmhLTGu1H++k9N8LywgJfPy3w8drku7mn987j7tvSA9lVfjky6ncprNwhHGnUZbvrfF+ay5bIbtO0d8p9qVH/C58rTkV50AKSAAAAAElFTkSuQmCC';

        var hasFailed = false;
        var lastRenderTime = 0;

        return {
            pageRender: function () {
                setFavIconElement(runningPassedIcon);
            },

            setup: function (runTest, test) {
                runTest();

                if (!hasFailed && test.isComplete() && !test.hasPassed()) {
                    hasFailed = true;
                    setFavIconElement(runningFailedIcon);
                }
            },

            onComplete: function () {
                if (hasFailed)
                    setFavIconElement(failedIcon);
                else
                    setFavIconElement(passedIcon);
            }
        };

        function setFavIconElement(url) {
            var favIcon = document.getElementById('favIcon');
            if (!favIcon) {
                favIcon = appendElement(document.head, 'link', {
                    id: 'favIcon',
                    rel: 'shortcut icon',
                    type: 'image/x-icon'
                });
            }
            favIcon.href = url;

            forceRender();
        }

        function forceRender() {
            if (Date.now() - lastRenderTime >= 250) {
                document.body.clientWidth;
                lastRenderTime = Date.now();
            }
        }
    };

    Basil.displayTestCountPlugin = function (browserRunner) {
        var originalTitle = document.title;
        var passed, failed, total;

        return {
            pageRender: function (header) {
                var container = appendElement(header, 'div', { id: 'basil-summary' });
                passed = appendElement(container, 'span', { className: 'basil-passes' });
                appendText(container, '/');
                failed = appendElement(container, 'span', { className: 'basil-fails' });
                appendText(container, '/');
                total = appendElement(container, 'span', { className: 'basil-total' });
            },

            setup: function (runTest) {
                runTest();

                passed.innerText = browserRunner.testCounts.passed;
                failed.innerText = browserRunner.testCounts.failed;
                total.innerText = browserRunner.testCounts.total;

                document.title = "[" + browserRunner.testCounts.passed + '/' + browserRunner.testCounts.failed + '/' + browserRunner.testCounts.total + "] " + originalTitle;
            }
        };
    };

    Basil.expandCollapsePlugin = function (localStorage) {
        localStorage = localStorage || {};

        return {
            testRender: function (testElement, test) {
                var expandCollapseIcon = appendElement(testElement, 'i', {
                    className: 'basil-test-icon basil-test-button'
                });

                if (!test.children().length)
                    return;

                var key = 'basil-collapsed-' + test.fullKey();
                applyCollapsedState();
                expandCollapseIcon.addEventListener('click', toggleCollapsed);

                function applyCollapsedState() {
                    var isCollapsed = !!localStorage[key];
                    removeClass(expandCollapseIcon, '(icon-caret-right|icon-caret-down)');
                    if (isCollapsed) {
                        addClass(expandCollapseIcon, 'icon-caret-right');
                        addClass(testElement, 'is-collapsed');
                    } else {
                        addClass(expandCollapseIcon, 'icon-caret-down');
                        removeClass(testElement, 'is-collapsed');
                    }
                }

                function toggleCollapsed() {
                    if (localStorage[key])
                        delete localStorage[key];
                    else
                        localStorage[key] = true;
                    applyCollapsedState();
                }
            }
        };
    };

    Basil.passedFailedIconPlugin = function () {
        return {
            testRender: function (testElement, test) {
                appendElement(testElement, 'i', {
                    className: 'basil-test-icon '
                        + (test.hasPassed() ? 'icon-ok' : 'icon-remove')
                });
            }
        };
    };

    Basil.testNamePlugin = function () {
        return {
            testRender: function (testElement, test) {
                appendText(testElement, test.name());
            }
        };
    };

    Basil.errorTextPlugin = function () {
        return {
            testRender: function (testElement, test) {
                var error = test.error();
                if (error)
                    appendText(testElement, ' (' + error + ')');
            }
        };
    };

    Basil.filterPlugin = function (browserRunner, location) {
        var filter = (param('filter') || '');
        var filterParts = filter
            .toLowerCase()
            .split('>')
            .filter(Boolean)
            .map(function (filterPart) { return filterPart.trim(); });
        var testDepth = 0;
        var filterForm, filterInput;

        return {
            pageRender: function (header) {
                filterForm = appendElement(header, 'form', {
                    id: 'basil-settings',
                    className: 'basil-header-section',
                    action: location.href
                });

                appendText(filterForm, 'Filter');

                filterInput = appendElement(filterForm, 'input', {
                    id: 'basil-filter',
                    type: 'search',
                    name: 'filter',
                    value: filter
                });
                filterInput.focus();

                filterForm.addEventListener('submit', function () {
                    browserRunner.abort();
                });

                filterForm.addEventListener('search', function () {
                    filterForm.submit();
                });
            },

            testRender: function (testElement, test) {
                var filterElement = appendElement(testElement, 'i', {
                    className: 'basil-test-icon basil-test-button icon-filter'
                });
                filterElement.addEventListener('click', function () {
                    filterInput.value = test.fullKey();
                    filterForm.submit();
                });
            },

            test: function (runTest, test) {
                var testKey = test.key();

                var isPartialMatch = testKey.indexOf(filterParts[testDepth] || '') > -1;
                var isExactMatch = testKey === filterParts[testDepth];
                var testMatchesFilter = isExactMatch
                    || (isPartialMatch && testDepth == filterParts.length - 1)
                    || testDepth >= filterParts.length;

                if (!testMatchesFilter)
                    test.skip();

                testDepth++;
                runTest();
                testDepth--;
            }
        };

        function param(key) {
            var query = location.search.substring(1);
            var vars = query.split('&');
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split('=');
                if (decodeURIComponent(pair[0]) == key) {
                    var value = pair[1].replace(/\+/g, ' ');
                    return decodeURIComponent(value);
                }
            }
        }
    };

    Basil.inspectPlugin = function () {
        return {
            testRender: function (testElement, test) {
                if (!test.inspect)
                    return;

                var inspectElement = appendElement(testElement, 'i', {
                    className: 'basil-test-icon basil-test-button icon-signin'
                });
                inspectElement.addEventListener('click', function () {
                    debugger;
                    test.inspect.call(test.inspectThisValue);
                });
            }
        };
    };

    Basil.viewCodePlugin = function () {
        return {
            testRender: function (testElement, test) {
                if (!test.inspect)
                    return;

                var codeIcon = appendElement(testElement, 'i', {
                    className: 'basil-test-icon basil-test-button icon-code'
                });

                var code = appendElement(testElement, 'code', {
                    innerHTML: test.inspect.toString().split("\n").slice(1, -1).join("\n"),
                    className: 'basil-code'
                });

                var isVisible = false;
                codeIcon.addEventListener('click', function () {
                    isVisible = !isVisible;
                    code.className = isVisible
                        ? 'basil-code is-basil-code-visible'
                        : 'basil-code';
                });
            }
        };
    };

    Basil.hidePassedPlugin = function (localStorage) {
        localStorage = localStorage || {};

        return {
            pageRender: function (header, results) {
                var label = appendElement(header, 'label', {
                    className: 'basil-header-section'
                });

                var checkbox = appendElement(label, 'input', {
                    type: 'checkbox',
                    checked: localStorage.isHidePassedChecked == 'true'
                });

                appendText(label, 'Hide Passed');

                updateHidePassedState();

                checkbox.addEventListener('change', updateHidePassedState);

                function updateHidePassedState() {
                    localStorage.isHidePassedChecked = checkbox.checked + '';
                    if (checkbox.checked)
                        addClass(results, 'is-hiding-passed');
                    else
                        removeClass(results, 'is-hiding-passed');
                }
            },

            testRender: function (testElement, test) {
                addClass(testElement,
                    test.hasPassed()
                        ? ' is-passed'
                        : ' is-failed');
            }
        };
    };

    function appendElement(el, tagName, properties) {
        var newElement = el.appendChild(document.createElement(tagName));
        Object.keys(properties).forEach(function (key) {
            newElement[key] = properties[key];
        });
        return newElement;
    }

    function appendText(el, text) {
        el.appendChild(document.createTextNode(text));
    }

    function addClass(el, className) {
        if (!new RegExp('\\b' + className + '\\b').test(el.className))
            el.className += ' ' + className;
    }

    function removeClass(el, className) {
        el.className = el.className.replace(new RegExp('\\b' + className + '\\b'), '');
    }
})(this);

basil = new Basil.BrowserRunner();
basil.registerPlugin(
    Basil.domFixturePlugin(),
    Basil.testCountPlugin(basil),
    Basil.headerStatePlugin(basil),
    Basil.bigTitlePlugin(location),
    Basil.favIconPlugin(),
    Basil.displayTestCountPlugin(basil),
    Basil.expandCollapsePlugin(localStorage),
    Basil.passedFailedIconPlugin(),
    Basil.testNamePlugin(),
    Basil.errorTextPlugin(),
    Basil.filterPlugin(basil, location),
    Basil.inspectPlugin(),
    Basil.viewCodePlugin(),
    Basil.hidePassedPlugin(localStorage)
);

test = describe = when = then = it = basil.test;

(function waitForBody() {
    if (document.body)
        basil.start();
    else
        setTimeout(waitForBody, 10);
})();
