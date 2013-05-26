﻿(function(global) {
    function extend(constructor, subPrototype) {
        var prototype = Object.create(constructor.prototype);
        Object.keys(subPrototype).forEach(function(key) {
            prototype[key] = subPrototype[key];
        });

        return prototype;
    }

    function BrowserRunner() {
        Basil.TestRunner.call(this);

        this._renderTestPlugins = [];
    }

    BrowserRunner.prototype = extend(Basil.TestRunner, {
        start: function() {
            setup();
            Basil.TestRunner.prototype.start.call(this);
        },

        registerRenderTestPlugin: function(plugin) {
            this._renderTestPlugins.push(plugin);
        }
    });

    var localStorage = global.localStorage || {};

    var rootTests = [];
    var totalCount = 0;
    var totalFails = 0;
    var totalPasses = 0;
    var hasFailed = false;

    var originalTitle = document.title;
    var favIconTimerId;

    var failedIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAHdSURBVDjLpZNraxpBFIb3a0ggISmmNISWXmOboKihxpgUNGWNSpvaS6RpKL3Ry//Mh1wgf6PElaCyzq67O09nVjdVlJbSDy8Lw77PmfecMwZg/I/GDw3DCo8HCkZl/RlgGA0e3Yfv7+DbAfLrW+SXOvLTG+SHV/gPbuMZRnsyIDL/OASziMxkkKkUQTJJsLaGn8/iHz6nd+8mQv87Ahg2H9Th/BxZqxEkEgSrq/iVCvLsDK9awtvfxb2zjD2ARID+lVVlbabTgWYTv1rFL5fBUtHbbeTJCb3EQ3ovCnRC6xAgzJtOE+ztheYIEkqbFaS3vY2zuIj77AmtYYDusPy8/zuvunJkDKXM7tYWTiyGWFjAqeQnAD6+7ueNx/FLpRGAru7mcoj5ebqzszil7DggeF/DX1nBN82rzPqrzbRayIsLhJqMPT2N83Sdy2GApwFqRN7jFPL0tF+10cDd3MTZ2AjNUkGCoyO6y9cRxfQowFUbpufr1ct4ZoHg+Dg067zduTmEbq4yi/UkYidDe+kaTcP4ObJIajksPd/eyx3c+N2rvPbMDPbUFPZSLKzcGjKPrbJaDsu+dQO3msfZzeGY2TCvKGYQhdSYeeJjUt21dIcjXQ7U7Kv599f4j/oF55W4g/2e3b8AAAAASUVORK5CYII=';
    var passedIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAKfSURBVDjLpZPrS1NhHMf9O3bOdmwDCWREIYKEUHsVJBI7mg3FvCxL09290jZj2EyLMnJexkgpLbPUanNOberU5taUMnHZUULMvelCtWF0sW/n7MVMEiN64AsPD8/n83uucQDi/id/DBT4Dolypw/qsz0pTMbj/WHpiDgsdSUyUmeiPt2+V7SrIM+bSss8ySGdR4abQQv6lrui6VxsRonrGCS9VEjSQ9E7CtiqdOZ4UuTqnBHO1X7YXl6Daa4yGq7vWO1D40wVDtj4kWQbn94myPGkCDPdSesczE2sCZShwl8CzcwZ6NiUs6n2nYX99T1cnKqA2EKui6+TwphA5k4yqMayopU5mANV3lNQTBdCMVUA9VQh3GuDMHiVcLCS3J4jSLhCGmKCjBEx0xlshjXYhApfMZRP5CyYD+UkG08+xt+4wLVQZA1tzxthm2tEfD3JxARH7QkbD1ZuozaggdZbxK5kAIsf5qGaKMTY2lAU/rH5HW3PLsEwUYy+YCcERmIjJpDcpzb6l7th9KtQ69fi09ePUej9l7cx2DJbD7UrG3r3afQHOyCo+V3QQzE35pvQvnAZukk5zL5qRL59jsKbPzdheXoBZc4saFhBS6AO7V4zqCpiawuptwQG+UAa7Ct3UT0hh9p9EnXT5Vh6t4C22QaUDh6HwnECOmcO7K+6kW49DKqS2DrEZCtfuI+9GrNHg4fMHVSO5kE7nAPVkAxKBxcOzsajpS4Yh4ohUPPWKTUh3PaQEptIOr6BiJjcZXCwktaAGfrRIpwblqOV3YKdhfXOIvBLeREWpnd8ynsaSJoyESFphwTtfjN6X1jRO2+FxWtCWksqBApeiFIR9K6fiTpPiigDoadqCEag5YUFKl6Yrciw0VOlhOivv/Ff8wtn0KzlebrUYwAAAABJRU5ErkJggg==';
    var runningPassedIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAIMSURBVBgZpcHNi05xGMfhz/07hzTDiKZmEmLYeM3iKTKUiFhY2EhZ2NjIBgsWYoUoSWr+B7NhY6GkJBRhYSMvJYRSFDPPi3N+9/01Z2Jvcl0mif9h+46PH92yrXXpe0f9EhCBIvBwFCIUyJ2QkDsewcDsuv3y5adTN67sHytbo61rs+b0p6E5zER/u+PXgLGyUyt1vk8yU91aiSmlXJw/uJKZOnzxPY1SChpVdgQohAcEIkJ4BJ6FZ+EKKhfLh+fh4TRKJBqWDJNQMmTCwkjJMEuYOVaIIhJlFo3ITiN5OI0EmBmWjCIZqTAsQZFgVlFw/tZuTt/cjIqaRnjQSAoxzYxGApIZKRlFYRQGKcGvXLF4cBXHxjdS5R4RTqOMcP4yM6ZJnLy+DSlTRabKmUULVrJqeCMTvTZ7x0ZYoKs0ylzXTDPDAEmYGTkqdq45hCvwcALx+cdH1i0eZbLq8qx7iPXnDswv5UGjAMQUM5Do5QpX8P7bG+rI5Kipvebnrwk2LNnKZN3h8bsH38qI4C8DjClm9HKP7JmhgaXkcFzBlx8fWDh3mOcfH/L47Qs6Tsv2HR8fH1qyaH+4Ex64OxHBz8Ej9KqKKip6uWLF4Go2jezi6YdH3H/1hGXdE7fvXD6zxyTxL9aeS+3W0u19917f/VQFOz5f0CummCT+xchZa3sUfd3wka8X9I4/fgON+TR7PCxMcAAAAABJRU5ErkJggg==';
    var runningFailedIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB90CBw0qMMQJoV8AAAIRSURBVDjLpZNPSFRRFMZ/575RLMsIJCU0UIwwN0EDVhYYQtjChYskaBH92UQrIYiI2lRSUC0E19FSiKBFELg1ixYt2khUSI4tFSxnnHnvnnNavBnbKl344HI4/M73ce8Rd+d/joxPzt48PVx8slbxVnfADDdDTXFzzA1XxdxxVdSMtuasvLj46/br5xMzheJQcbqppTV0tOxocGu5otPATKGSeaisbezY+mbmAaDg6jy61LdjwPXHP8kBbgCkUXHAzVEDwzFz1AyNnsuNVJ2ezr2oaQ6g/goSBHHHg+DiiAkhCCIBEUUSJ7FAIeb9FnNAaJACICJIEJIghESQAEmApiRhbuwCb8+O4kmWAzR3Htzq/0BkCxQkn54kQiIQAsQ0pb3/MG9OjhCrNawRoXGh7gAAd14Nj+HRsJgRY8b+vh46B49TLW8w0zuAXp3KATHLthwI4O6ICJZmDFy+iJtiquDOemmFrqFB0s0yx57d4OHUlX0Fr2dJAG9EcSemNdyU1W8/sJhhWYZmGbU/v+k+c4qsUmZpfn61YGb/ItSFCLFaRWOk7VAXphE3Y325xJ7OA5Tef+D7l88oWpTxydnZju6DE6aKqaGqmBknXtwiTWtYmhLTGu1H++k9N8LywgJfPy3w8drku7mn987j7tvSA9lVfjky6ncprNwhHGnUZbvrfF+ay5bIbtO0d8p9qVH/C58rTkV50AKSAAAAAElFTkSuQmCC';

    var baseTemplate =
        '<div id="basil-header">'
            + '<div id="basil-summary">'
                + '<span id="basil-passes"></span>/'
                + '<span id="basil-fails"></span>/'
                + '<span id="basil-total"></span>'
            + '</div>'
            + '<a id="basil-title"></a>'
            + '<form method="get" id="basil-settings">'
                + '<label>Filter <input type="text" id="basil-filter" name="filter"></label>'
                + '<label><input type="checkbox" id="basil-hide-passed" name="hide-passed">Hide Passed</label>'
            + '</form>'
        + '</div>'
        + '<div id="basil-results"></div>';

    var testRunner = global.basil = new BrowserRunner();

    var filterParts = (param('filter') || '')
        .toLowerCase()
        .split('>')
        .filter(Boolean)
        .map(function(filterPart) { return filterPart.trim();});
    var testDepth = 0;

    testRunner.registerSetupPlugin(setupDomFixture);
    testRunner.registerSetupPlugin(onRootComplete);
    testRunner.registerTestPlugin(filterTests);


    function setupDomFixture(runTest) {
        var domElement = null;

        Object.defineProperty(this, 'dom', {
            get: function() {
                if (domElement != null)
                    return domElement;

                domElement = document.createElement('div');
                domElement.id = 'basil-temporary-dom-element';
                domElement.style.position = 'absolute';
                domElement.style.top = '10000px';
                domElement.style.left = '10000px';
                domElement.style.width = '10000px';
                domElement.style.height = '10000px';
                domElement.className = 'basil-temporary-dom-element';
                document.body.appendChild(domElement);
                return domElement;
            }
        });

        runTest();

        if (domElement)
            document.body.removeChild(domElement);
    }

    function onRootComplete (runTest, test) {
        if (!test.runCount())
            rootTests.push(test);

        runTest();

        if (test.isComplete()){
            var resultsElement = document.getElementById('basil-results');
            appendResults(resultsElement, [test]);
            updateTotals(test);

            if (!test.hasPassed()) {
                hasFailed = true;
                var header = document.getElementById('basil-header');
                if (header.classList)
                    header.classList.add('is-failed');
                else
                    header.className = 'is-failed';
            }

            updateRunStatus();
        }

        return test;
    }

    function filterTests (runTest, test) {
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

    function param (key) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) == key) {
                var value = pair[1].replace(/\+/g, ' ');
                return decodeURIComponent(value);
            }
        }
    }

    function setup () {
        setFavIconElement(runningPassedIcon);

        createBaseStructure();
        setTitle();
        setupSettingsForm();
        setupHidePassed();

        function createBaseStructure () {
            var body = document.body;
            createDom(baseTemplate)
                .forEach(body.appendChild.bind(body));
        }

        function setTitle () {
            var pageTitle = document.getElementsByTagName('title');
            var titleText = pageTitle.length ? pageTitle[0].innerText : 'Basil';
            document.getElementById('basil-title').innerText = titleText;
            document.getElementById('basil-title').href = document.location.href.replace(document.location.search, '');
        }

        function setupSettingsForm () {
            document.getElementById('basil-settings').setAttribute('action', document.location.href);
            document.getElementById('basil-settings').addEventListener('submit', function() {
                testRunner.abort();
            });

            var filter = document.getElementById('basil-filter');
            filter.setAttribute('value', param('filter') || '');
            filter.focus();
        }

        function setupHidePassed () {
            var checkbox = document.getElementById('basil-hide-passed');
            var results = document.getElementById('basil-results');

            checkbox.checked = localStorage.isHidePassedChecked == 'true';
            updateHidePassedState();

            checkbox.addEventListener('change', updateHidePassedState);

            function updateHidePassedState () {
                localStorage.isHidePassedChecked = checkbox.checked;
                if (checkbox.checked)
                    results.setAttribute('class', 'is-hiding-passed');
                else
                    results.removeAttribute('class');
            }
        }
    }

    function appendResults (el, tests) {
        tests = tests.filter(function(t) { return !t.wasSkipped(); });

        if (!tests.length)
            return;

        var ul = document.createElement('ul');
        tests.forEach(function(test, i) {
            var li = createLi(test);
            appendResults(li, test.children());
            ul.appendChild(li);
        });

        el.appendChild(ul);
    }

    function createLi (test) {
        var li = document.createElement('li');
        li.test = test;
        li.setAttribute('class', getCssClass(li));

        testRunner._renderTestPlugins.forEach(function(plugin) {
            plugin(li, test);
        });

        return li;
    }

    function getCssClass (li) {
        var test = li.test;
        var cssClass = test.isComplete()
            ? (test.hasPassed() ? 'is-passed' : 'is-failed')
            : 'is-not-run';

        cssClass += test.children().length ? ' basil-parent' : ' basil-leaf';
        return cssClass;
    }

    function updateRunStatus () {
        if (favIconTimerId)
            clearTimeout(favIconTimerId);

        document.title = "[" + totalPasses + '/' + totalFails + '/' + totalCount + "] " + originalTitle;
        setRunning();
        favIconTimerId = setTimeout(setNotRunning, 10);
    }

    function setRunning() {
        var header = document.getElementById('basil-header')

        if (header.classList)
            header.classList.add('is-running');
        if (hasFailed)
            setFavIconElement(runningFailedIcon);
        else
            setFavIconElement(runningPassedIcon);

        forceRender();
    }

    function setNotRunning() {
        var header = document.getElementById('basil-header')

        if (header.classList)
            header.classList.remove('is-running');
        if (hasFailed)
            setFavIconElement(failedIcon);
        else
            setFavIconElement(passedIcon);
        favIconTimerId = null;
        forceRender();
    }

    var lastRenderTime = 0;
    function forceRender() {
        if (Date.now() - lastRenderTime < 250)
            return;
        document.body.clientWidth;
        lastRenderTime = Date.now();
    }

    function setFavIconElement (url) {
        var favIcon = document.getElementById('favIcon');
        if (!favIcon) {
            favIcon = document.createElement('link');
            favIcon.id = 'favIcon';
            favIcon.rel = 'shortcut icon';
            favIcon.type = 'image/x-icon';
            document.head.appendChild(favIcon);
        }
        favIcon.href = url;
    }

    function updateTotals () {
        totalPasses = totalFails = totalCount = 0;
        rootTests.forEach(calculateTotals);

        document.getElementById('basil-passes').innerText = totalPasses;
        document.getElementById('basil-fails').innerText = totalFails;
        document.getElementById('basil-total').innerText = totalCount;
    }

    function calculateTotals (test) {
        totalCount++;
        if (test.runCount()) {
            if (test.hasPassed())
                totalPasses++;
            else
                totalFails++;
        }
        test.children().forEach(calculateTotals);
    }

    var nursery;

    function createDom (html) {
        if (!nursery)
            nursery = document.createElement('div');

        nursery.innerHTML = html;
        var elements = [];

        while (nursery.children.length)
            elements.push(nursery.removeChild(nursery.children[0]));

        return elements;
    }
})(this);

(function waitForBody () {
    if (document.body)
        basil.start();
    else
        setTimeout(waitForBody, 10);
})();

(function expandCollapsePlugin(browserRunner, localStorage) {
    localStorage = localStorage || {};

    browserRunner.registerRenderTestPlugin(function (testElement, test) {
        var expandCollapseIcon = document.createElement('i');
        expandCollapseIcon.className = 'basil-test-icon basil-test-button';
        testElement.appendChild(expandCollapseIcon);

        if (!test.children().length)
            return;

        var key = 'basil-collapsed-' + test.fullKey();
        applyCollapsedState();
        expandCollapseIcon.addEventListener('click', toggleCollapsed);

        function applyCollapsedState () {
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

        function addClass(el, className) {
            if (!new RegExp('\\b' + className + '\\b').test(el.className))
                el.className += ' ' + className;
        }

        function removeClass(el, className) {
            el.className = el.className.replace(new RegExp('\\b' + className + '\\b'), '');
        }

        function toggleCollapsed () {
            if (localStorage[key])
                delete localStorage[key];
            else
                localStorage[key] = true;
            applyCollapsedState();
        }
    });
})(basil, localStorage);

(function passedFailedIconPlugin(browserRunner) {
    browserRunner.registerRenderTestPlugin(function (testElement, test) {
        var icon = document.createElement('i');
        icon.className = 'basil-test-icon ' + (test.hasPassed() ? 'icon-ok' : 'icon-remove');
        testElement.appendChild(icon);
    });
})(basil);

(function testNamePlugin(browserRunner) {
    browserRunner.registerRenderTestPlugin(function (testElement, test) {
        testElement.appendChild(document.createTextNode(test.name()));
    });
})(basil);

(function errorTextPlugin(browserRunner) {
    browserRunner.registerRenderTestPlugin(function (testElement, test) {
        var error = test.error();
        if (error)
            testElement.appendChild(document.createTextNode(' (' + error + ')'));
    });
})(basil);

(function filterPlugin(browserRunner) {
    basil.registerRenderTestPlugin(function (testElement, test) {
        var filterElement = document.createElement('i');
        filterElement.className = 'basil-test-icon basil-test-button icon-filter';
        filterElement.addEventListener('click', function() {
            browserRunner.abort();
            document.getElementById('basil-filter').value = test.fullKey();
            document.getElementById('basil-settings').submit();
        });

        testElement.appendChild(filterElement);
    });
})(basil);

(function inspectPlugin(browserRunner) {
    browserRunner.registerRenderTestPlugin(function (li, test) {
        if (!test.inspect)
            return;

        var inspectElement = document.createElement('i');
        inspectElement.className = 'basil-test-icon basil-test-button icon-signin';
        inspectElement.addEventListener('click', function() {
            debugger;
            test.inspect();
        });
        li.appendChild(inspectElement);
    });
})(basil);

(function viewCodePlugin(browserRunner) {
    browserRunner.registerRenderTestPlugin(function (testElement, test) {
        if (!test.inspect)
            return;

        var codeIcon = document.createElement('i');
        codeIcon.className = 'basil-test-icon basil-test-button icon-code';
        testElement.appendChild(codeIcon);

        var code = document.createElement('code');
        code.innerHTML = test.inspect.toString().split("\n").slice(1, -1).join("\n");
        code.className = 'basil-code';
        testElement.appendChild(code);

        var isVisible = false;
        codeIcon.addEventListener('click', function() {
            isVisible = !isVisible;
            code.className = isVisible
                ? 'basil-code is-basil-code-visible'
                : 'basil-code';
        });
    });
})(basil);

test = describe = when = then = it = basil.test;