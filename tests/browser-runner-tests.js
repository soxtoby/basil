describe("Browser Runner", function () {
    var browserRunner = new Basil.BrowserRunner();

    describe("DOM fixture plugin", function () {
        var sut = Basil.domFixturePlugin();
        var testContext = {};

        when("setup called", function () {
            sut.setup.call(testContext, function () {
                then("dom element added to body", function () {
                    expect(testContext.dom).to.be.an.instanceOf(HTMLElement);
                    expect(testContext.dom.parentElement).to.equal(document.body);
                });

                then("dom element is empty", function () {
                    expect(testContext.dom.children.length).to.equal(0);
                });
            });
        });

        when("after setup complete", function () {
            sut.setup.call(testContext, function() { testContext.dom; });

            then("dom element has been removed from body", function () {
                expect(testContext.dom.parentElement).to.be.null;
            });
        })
    });

    describe("Test count plugin", function () {
        var sut = Basil.testCountPlugin(browserRunner);

        when("test runner has no tests", function () {
            browserRunner.tests = function () { return []; };

            when("test tree is run", function () {
                sut.setup.call({}, function () { });

                then("test counts are 0", function () {
                    expect(browserRunner.testCounts).to.deep.equal({
                        passed: 0,
                        failed: 0,
                        total: 0
                    });
                });
            });
        });

        when("test runner has tree of tests", function() {
            var a = new Basil.Test('a');
            var aa = a.child('aa');
            var aaa = aa.child('aaa');  // leaf
            var ab = a.child('ab'); // leaf
            var b = new Basil.Test('b');  // leaf
            browserRunner.tests = function () { return [a, b]; };

            when("test tree is run", function () {
                sut.setup.call({}, function () { });

                then("only leaves are counted", function () {
                    expect(browserRunner.testCounts.total).to.equal(3);
                });
            });
        });

        when("test runner has a mixture of passing, failing & incomplete tests", function () {
            var pass = new Basil.Test();
            var fail = new Basil.Test();
            fail.hasPassed = function () { return false; };
            pass.isComplete = fail.isComplete = function () { return true; };
            var incomplete = new Basil.Test();
            browserRunner.tests = function () { return [pass, pass, pass, fail, fail, incomplete]; };

            when("test tree is run", function () {
                sut.setup.call({}, function () { });

                then("all passes counted", function() {
                    expect(browserRunner.testCounts.passed).to.equal(3);
                });

                then("all fails counted", function() {
                    expect(browserRunner.testCounts.failed).to.equal(2);
                });

                then("total includes all passed, failed & incomplete", function() {
                    expect(browserRunner.testCounts.total).to.equal(6);
                });
            });
        });
    });

    describe("Header state plugin", function () {
        var sut = Basil.headerStatePlugin(browserRunner);
        browserRunner.testCounts = { };

        when("page rendered", function () {
            sut.pageRender(this.dom);

            it("adds 'running' class to header", function () {
                expect(this.dom.className).to.contain("is-running");
            });

            when("tests are complete", function () {
                sut.onComplete();

                it("removes 'running' class from header", function () {
                    expect(this.dom.className).to.not.contain('is-running');
                })
            });

            when("there are failing tests", function () {
                browserRunner.testCounts.failed = 1;

                when("tests are complete", function () {
                    sut.onComplete();

                    it("adds 'failed' class to header", function () {
                        expect(this.dom.className).to.contain('is-failed');
                    });
                });
            });

            when("there are no failing tests", function () {
                browserRunner.testCounts.failed = 0;

                when("tests are complete", function () {
                    sut.onComplete();

                    it("doesn't add 'failed' class to header", function () {
                        expect(this.dom.className).to.not.contain('is-failed');
                    });
                });
            });
        });
    });

    describe("Big title plugin", function () {
        var location = { href: 'foo?bar', search: '?bar' };
        var sut = Basil.bigTitlePlugin(browserRunner, location);

        when("document has a title set", function () {
            document.title = 'baz';

            when("page rendered", function () {
                sut.pageRender(this.dom);

                then("title tag added to header", function () {
                    expect(this.dom.children.length).to.equal(1);
                });

                var title = this.dom.children[0];

                then("title tag contains document title", function () {
                    expect(title.innerText).to.equal('baz');
                });

                then("title tag links to current page without query string", function () {
                    expect(title.href).to.match(/\/foo$/);
                });
            });
        });

        when("document has no title set", function () {
            document.title = '';

            when("page rendered", function () {
                sut.pageRender(this.dom);

                then("title tag contents default to 'Basil'", function () {
                    expect(this.dom.children[0].innerText).to.equal('Basil');
                });
            });
        });
    });

    describe("Display test count plugin", function () {
        document.title = 'foo';
        var sut = Basil.displayTestCountPlugin(browserRunner);

        when("page rendered", function () {
            sut.pageRender(this.dom);

            then("passed, failed & total elements added to header", function () {
                expect(this.dom.querySelector('.basil-passes')).to.exist;
                expect(this.dom.querySelector('.basil-fails')).to.exist;
                expect(this.dom.querySelector('.basil-total ')).to.exist;
            });

            when("test runner includes test counts", function () {
                browserRunner.testCounts = { passed: 1, failed: 2, total: 3 };

                when("test tree run", function () {
                    sut.setup(function () { });

                    then("passes element updated", function () {
                        expect(this.dom.querySelector('.basil-passes').innerText).to.equal('1');
                    });

                    then("fails element updated", function () {
                        expect(this.dom.querySelector('.basil-fails').innerText).to.equal('2');
                    });

                    then("total element updated", function () {
                        expect(this.dom.querySelector('.basil-total').innerText).to.equal('3');
                    });

                    then("document title includes test counts", function () {
                        expect(document.title).to.equal('[1/2/3] foo');
                    });
                });
            });
        });
    });

    describe("Expand/collapse plugin", function () {
        var sut = Basil.expandCollapsePlugin(browserRunner);
        var test = new Basil.Test('foo');

        when("test has no children", function () {
            when("test rendered", function () {
                sut.testRender(this.dom, test);

                then("expand collapse icon added to test element", function () {
                    expect(this.dom.children.length).to.equal(1);
                });
            });
        });

        when("test has children", function () {
            test.child('foo');

            when("test rendered", function() {
                sut.testRender(this.dom, test);
                var icon = this.dom.children[0];

                then("test is expanded", function () {
                    expect(this.dom.className).to.not.contain('is-collapsed');
                    expect(icon.className).to.contain('icon-caret-down');
                    expect(icon.className).to.not.contain('icon-caret-right');
                });

                when("icon clicked", function () {
                    icon.dispatchEvent(new MouseEvent('click'));

                    then("test is collapsed", function () {
                        expect(this.dom.className).to.contain('is-collapsed');
                        expect(icon.className).to.not.contain('icon-caret-down');
                        expect(icon.className).to.contain('icon-caret-right');
                    });

                    when("icon clicked again", function () {
                        icon.dispatchEvent(new MouseEvent('click'));

                        then("test is expanded", function () {
                            expect(this.dom.className).to.not.contain('is-collapsed');
                            expect(icon.className).to.contain('icon-caret-down');
                            expect(icon.className).to.not.contain('icon-caret-right');
                        });
                    });
                });
            });
        });
    });

    describe("Passed/failed icon plugin", function () {
        var sut = Basil.passedFailedIconPlugin();
        var test = new Basil.Test();

        when("test has passed", function() {
            test.hasPassed = function() { return true; };

            when("test is rendered", function () {
                sut.testRender(this.dom, test);

                then("'passed' icon added to test element", function () {
                    expect(this.dom.children[0].className).to.contain('icon-ok');
                });
            });
        });

        when("test has failed", function () {
            test.hasPassed = function () { return false; };

            when("test is rendered", function () {
                sut.testRender(this.dom, test);

                then("'failed' icon added to test element", function () {
                    expect(this.dom.children[0].className).to.contain('icon-remove');
                });
            });
        });
    });

    describe("Test name plugin", function () {
        var sut = Basil.testNamePlugin();

        when("test is rendered", function () {
            var test = new Basil.Test('foo');
            sut.testRender(this.dom, test);

            then("test name added to test element", function () {
                expect(this.dom.innerText).to.equal('foo');
            });
        });
    });

    describe("Error text plugin", function () {
        var sut = Basil.errorTextPlugin();
        var test = new Basil.Test();
        this.dom.innerText = 'testName';

        when("test has no error", function () {
            when("test is rendered", function () {
                sut.testRender(this.dom, test);

                then("nothing added to test element", function () {
                    expect(this.dom.innerText).to.equal('testName');
                });
            });
        });

        when("test has an error", function () {
            var error = new Error('foo');
            test.error = function () { return error; };

            when("test is rendered", function () {
                sut.testRender(this.dom, test);

                then("error string added to test element", function () {
                    expect(this.dom.innerText).to.equal('testName (' + error + ')' );
                });
            });
        });
    });
});