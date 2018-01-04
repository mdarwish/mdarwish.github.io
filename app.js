var visualResume = angular.module('visualResume', []);

visualResume.controller('mainController', function($scope, $sce) {
    'use strict';
    $scope.safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    $scope.keyPress = function(key) {
        if (key.which === 13) {
            data.reloadData($scope.resumeURL);
        }
    };

    $scope.trustAsHtml = $sce.trustAsHtml;


    data.whenDataLoaded(function($sce) {

        var basics = data.resume.basics;
        $scope.resume = data.resume;
        $scope.socialNetworks = basics.profiles;
        $scope.name = basics.name;
        $scope.email = basics.email;
        $scope.label = basics.label;
        $scope.phone = basics.phone;
        $scope.website = basics.website;
        $scope.summary = basics.summary;
        $scope.location = basics.location;

        if (data.resume.basics.email != "undefined") {
            $scope.hash = CryptoJS.MD5(data.resume.basics.email.toLowerCase()).toString();
        }

        $scope.resume.skills = _.sortBy(data.resume.skills, function(skill) {
            var level = skill.level && skill.level.toLowerCase(),
                sort_map = {
                    master: 1,
                    advanced: 2,
                    intermediate: 3,
                    beginner: 4
                };

            return sort_map[level];
        });
        $scope.safeApply();
    });
});
// Adapted from https://github.com/jiahuang/d3-timeline
(function() {
    d3.timeline = function() {
        var DISPLAY_TYPES = ["circle", "rect"];

        var hover = function() {},
            mouseover = function() {},
            mouseout = function() {},
            click = function() {},
            scroll = function() {},
            orient = "bottom",
            width = null,
            height = null,
            rowSeperatorsColor = null,
            backgroundColor = null,
            tickFormat = {
                format: d3.time.format("%Y"),
                tickTime: d3.time.years,
                tickInterval: 1,
                tickSize: 6
            },
            colorCycle = d3.scale.category20(),
            colorPropertyName = null,
            display = "rect",
            beginning = 0,
            ending = 0,
            margin = { left: 30, right: 30, top: 30, bottom: 30 },
            stacked = false,
            rotateTicks = false,
            timeIsRelative = false,
            itemHeight = 20,
            itemMargin = 5,
            showTodayLine = false,
            showTodayFormat = { marginTop: 25, marginBottom: 0, width: 1, color: colorCycle },
            showBorderLine = false,
            showBorderFormat = { marginTop: 25, marginBottom: 0, width: 1, color: colorCycle };

        function timeline(gParent) {
            var g = gParent.append("g");
            var gParentSize = gParent[0][0].getBoundingClientRect();

            var gParentItem = d3.select(gParent[0][0]);

            var yAxisMapping = {},
                maxStack = 1,
                minTime = 0,
                maxTime = 0;

            setWidth();

            // check if the user wants relative time
            // if so, substract the first timestamp from each subsequent timestamps
            if (timeIsRelative) {
                g.each(function(d, i) {
                    d.forEach(function(datum, index) {
                        datum.times.forEach(function(time, j) {
                            if (index === 0 && j === 0) {
                                originTime = time.starting_time; //Store the timestamp that will serve as origin
                                time.starting_time = 0; //Set the origin
                                time.ending_time = time.ending_time - originTime; //Store the relative time (millis)
                            } else {
                                time.starting_time = time.starting_time - originTime;
                                time.ending_time = time.ending_time - originTime;
                            }
                        });
                    });
                });
            }

            // check how many stacks we're gonna need
            // do this here so that we can draw the axis before the graph
            if (stacked || ending === 0 || beginning === 0) {
                g.each(function(d, i) {
                    d.forEach(function(datum, index) {

                        // create y mapping for stacked graph
                        if (stacked && Object.keys(yAxisMapping).indexOf(index) == -1) {
                            yAxisMapping[index] = maxStack;
                            maxStack++;
                        }

                        // figure out beginning and ending times if they are unspecified
                        datum.times.forEach(function(time, i) {
                            if (beginning === 0)
                                if (time.starting_time < minTime || (minTime === 0 && timeIsRelative === false))
                                    minTime = time.starting_time;
                            if (ending === 0)
                                if (time.ending_time > maxTime)
                                    maxTime = time.ending_time;
                        });
                    });
                });

                if (ending === 0) {
                    ending = maxTime;
                }
                if (beginning === 0) {
                    beginning = minTime;
                }
            }

            var scaleFactor = (1 / (ending - beginning)) * (width - margin.left - margin.right);

            // draw the axis
            var xScale = d3.time.scale()
                .domain([beginning, ending])
                .range([margin.left, width - margin.right]);

            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient(orient)
                .tickFormat(tickFormat.format)
                .ticks(tickFormat.numTicks || tickFormat.tickTime, tickFormat.tickInterval)
                .tickSize(tickFormat.tickSize);

            g.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(" + 0 + "," + (margin.top + (itemHeight + itemMargin) * maxStack) + ")")
                .call(xAxis);

            // draw the chart
            g.each(function(d, i) {
                d.forEach(function(datum, index) {
                    var data = datum.times;
                    var hasLabel = (typeof(datum.label) != "undefined");
                    var hasId = (typeof(datum.id) != "undefined");


                    if (backgroundColor) {
                        var greenbarYAxis = ((itemHeight + itemMargin) * yAxisMapping[index]);
                        g.selectAll("svg").data(data).enter()
                            .insert("rect")
                            .attr("class", "row-green-bar")
                            .attr("x", 0 + margin.left)
                            .attr("width", width - margin.right - margin.left)
                            .attr("y", greenbarYAxis)
                            .attr("height", itemHeight)
                            .attr("fill", backgroundColor);
                    }

                    g.selectAll("svg").data(data).enter()
                        .append(display)
                        .attr("x", getXPos)
                        .attr("y", getStackPosition)
                        .attr("width", function(d, i) {
                            return (d.ending_time - d.starting_time) * scaleFactor;
                        })
                        .attr("cy", getStackPosition)
                        .attr("cx", getXPos)
                        .attr("r", itemHeight / 2)
                        .attr("height", itemHeight)
                        .style("fill", function(d, i) {
                            if (d.color) return d.color;
                            if (colorPropertyName) {
                                return colorCycle(datum[colorPropertyName]);
                            }
                            return colorCycle(index);
                        })
                        .on("mousemove", function(d, i) {
                            hover(d, index, datum);
                        })
                        .on("mouseover", function(d, i) {
                            mouseover(d, i, datum);
                        })
                        .on("mouseout", function(d, i) {
                            mouseout(d, i, datum);
                        })
                        .on("click", function(d, i) {
                            click(d, index, datum);
                        })
                        .attr("id", function(d, i) {
                            if (hasId) {
                                return "timelineItem_" + datum.id;
                            } else {
                                return "timelineItem_" + index;
                            }
                        });

                    g.selectAll("svg").data(data).enter()
                        .append("text")
                        .attr("x", getXTextPos)
                        .attr("y", getStackTextPosition)
                        .text(function(d) {
                            return d.label;
                        });

                    if (rowSeperatorsColor) {
                        var lineYAxis = (itemHeight + itemMargin / 2 + margin.top + (itemHeight + itemMargin) * yAxisMapping[index]);
                        gParent.append("svg:line")
                            .attr("class", "row-seperator")
                            .attr("x1", 0 + margin.left)
                            .attr("x2", width - margin.right)
                            .attr("y1", lineYAxis)
                            .attr("y2", lineYAxis)
                            .attr("stroke-width", 1)
                            .attr("stroke", rowSeperatorsColor);
                    }

                    // add the label
                    if (hasLabel) {
                        gParent.append("text")
                            .attr("class", "timeline-label")
                            .attr("transform", "translate(" + 0 + "," + (itemHeight * 0.75 + margin.top + (itemHeight + itemMargin) * yAxisMapping[index]) + ")")
                            .text(hasLabel ? datum.label : datum.id)
                            .on("click", function(d, i) {
                                click(d, index, datum);
                            });
                    }

                    if (typeof(datum.icon) !== "undefined") {
                        gParent.append("image")
                            .attr("class", "timeline-label")
                            .attr("transform", "translate(" + 0 + "," + (margin.top + (itemHeight + itemMargin) * yAxisMapping[index]) + ")")
                            .attr("xlink:href", datum.icon)
                            .attr("width", margin.left)
                            .attr("height", itemHeight);
                    }

                    function getStackPosition(d, i) {
                        if (stacked) {
                            return margin.top + (itemHeight + itemMargin) * yAxisMapping[index];
                        }
                        return margin.top;
                    }

                    function getStackTextPosition(d, i) {
                        if (stacked) {
                            return margin.top + (itemHeight + itemMargin) * yAxisMapping[index] + itemHeight * 0.75;
                        }
                        return margin.top + itemHeight * 0.75;
                    }
                });
            });

            if (width > gParentSize.width) {
                var move = function() {
                    var x = Math.min(0, Math.max(gParentSize.width - width, d3.event.translate[0]));
                    zoom.translate([x, 0]);
                    g.attr("transform", "translate(" + x + ",0)");
                    scroll(x * scaleFactor, xScale);
                };

                var zoom = d3.behavior.zoom().x(xScale).on("zoom", move);

                gParent
                    .attr("class", "scrollable")
                    .call(zoom);
            }

            if (rotateTicks) {
                g.selectAll("text")
                    .attr("transform", function(d) {
                        return "rotate(" + rotateTicks + ")translate(" + (this.getBBox().width / 2 + 10) + "," + this.getBBox().height / 2 + ")";
                    });
            }

            var gSize = g[0][0].getBoundingClientRect();
            setHeight();

            if (showBorderLine) {
                g.each(function(d, i) {
                    d.forEach(function(datum) {
                        var times = datum.times;
                        times.forEach(function(time) {
                            appendLine(xScale(time.starting_time), showBorderFormat);
                            appendLine(xScale(time.ending_time), showBorderFormat);
                        });
                    });
                });
            }

            if (showTodayLine) {
                var todayLine = xScale(new Date());
                appendLine(todayLine, showTodayFormat);
            }

            function getXPos(d, i) {
                return margin.left + (d.starting_time - beginning) * scaleFactor;
            }

            function getXTextPos(d, i) {
                return margin.left + (d.starting_time - beginning) * scaleFactor + 5;
            }

            function setHeight() {
                if (!height && !gParentItem.attr("height")) {
                    if (itemHeight) {
                        // set height based off of item height
                        height = gSize.height + gSize.top - gParentSize.top;
                        // set bounding rectangle height
                        d3.select(gParent[0][0]).attr("height", height);
                    } else {
                        throw "height of the timeline is not set";
                    }
                } else {
                    if (!height) {
                        height = gParentItem.attr("height");
                    } else {
                        gParentItem.attr("height", height);
                    }
                }
            }

            function setWidth() {
                if (!width && !gParentSize.width) {
                    try {
                        width = gParentItem.attr("width");
                        if (!width) {
                            throw "width of the timeline is not set. As of Firefox 27, timeline().with(x) needs to be explicitly set in order to render";
                        }
                    } catch (err) {
                        console.log(err);
                    }
                } else if (!(width && gParentSize.width)) {
                    try {
                        width = gParentItem.attr("width");
                    } catch (err) {
                        console.log(err);
                    }
                }
                // if both are set, do nothing
            }

            function appendLine(lineScale, lineFormat) {
                gParent.append("svg:line")
                    .attr("x1", lineScale)
                    .attr("y1", lineFormat.marginTop)
                    .attr("x2", lineScale)
                    .attr("y2", height - lineFormat.marginBottom)
                    .style("stroke", lineFormat.color) //"rgb(6,120,155)")
                    .style("stroke-width", lineFormat.width);
            }

        }

        // SETTINGS

        timeline.margin = function(p) {
            if (!arguments.length) return margin;
            margin = p;
            return timeline;
        };

        timeline.orient = function(orientation) {
            if (!arguments.length) return orient;
            orient = orientation;
            return timeline;
        };

        timeline.itemHeight = function(h) {
            if (!arguments.length) return itemHeight;
            itemHeight = h;
            return timeline;
        };

        timeline.itemMargin = function(h) {
            if (!arguments.length) return itemMargin;
            itemMargin = h;
            return timeline;
        };

        timeline.height = function(h) {
            if (!arguments.length) return height;
            height = h;
            return timeline;
        };

        timeline.width = function(w) {
            if (!arguments.length) return width;
            width = w;
            return timeline;
        };

        timeline.display = function(displayType) {
            if (!arguments.length || (DISPLAY_TYPES.indexOf(displayType) == -1)) return display;
            display = displayType;
            return timeline;
        };

        timeline.tickFormat = function(format) {
            if (!arguments.length) return tickFormat;
            tickFormat = format;
            return timeline;
        };

        timeline.hover = function(hoverFunc) {
            if (!arguments.length) return hover;
            hover = hoverFunc;
            return timeline;
        };

        timeline.mouseover = function(mouseoverFunc) {
            if (!arguments.length) return mouseoverFunc;
            mouseover = mouseoverFunc;
            return timeline;
        };

        timeline.mouseout = function(mouseoverFunc) {
            if (!arguments.length) return mouseoverFunc;
            mouseout = mouseoverFunc;
            return timeline;
        };

        timeline.click = function(clickFunc) {
            if (!arguments.length) return click;
            click = clickFunc;
            return timeline;
        };

        timeline.scroll = function(scrollFunc) {
            if (!arguments.length) return scroll;
            scroll = scrollFunc;
            return timeline;
        };

        timeline.colors = function(colorFormat) {
            if (!arguments.length) return colorCycle;
            colorCycle = colorFormat;
            return timeline;
        };

        timeline.beginning = function(b) {
            if (!arguments.length) return beginning;
            beginning = b;
            return timeline;
        };

        timeline.ending = function(e) {
            if (!arguments.length) return ending;
            ending = e;
            return timeline;
        };

        timeline.rotateTicks = function(degrees) {
            rotateTicks = degrees;
            return timeline;
        };

        timeline.stack = function() {
            stacked = !stacked;
            return timeline;
        };

        timeline.relativeTime = function() {
            timeIsRelative = !timeIsRelative;
            return timeline;
        };

        timeline.showBorderLine = function() {
            showBorderLine = !showBorderLine;
            return timeline;
        };

        timeline.showBorderFormat = function(borderFormat) {
            if (!arguments.length) return showBorderFormat;
            showBorderFormat = borderFormat;
            return timeline;
        };

        timeline.showToday = function() {
            showTodayLine = !showTodayLine;
            return timeline;
        };

        timeline.showTodayFormat = function(todayFormat) {
            if (!arguments.length) return showTodayFormat;
            showTodayFormat = todayFormat;
            return timeline;
        };

        timeline.colorProperty = function(colorProp) {
            if (!arguments.length) return colorPropertyName;
            colorPropertyName = colorProp;
            return timeline;
        };

        timeline.rowSeperators = function(color) {
            if (!arguments.length) return rowSeperatorsColor;
            rowSeperatorsColor = color;
            return timeline;
        };

        timeline.background = function(color) {
            if (!arguments.length) return backgroundColor;
            backgroundColor = color;
            return timeline;
        };

        return timeline;
    };
})();

function Event(name) {
    this.name = name;
    this.callbacks = [];
}
Event.prototype.registerCallback = function(callback) {
    this.callbacks.push(callback);
};

function Reactor() {
    this.events = {};
}

Reactor.prototype.registerEvent = function(eventName) {
    var event = new Event(eventName);
    this.events[eventName] = event;
};

Reactor.prototype.dispatchEvent = function(eventName, eventArgs) {
    this.events[eventName].callbacks.forEach(function(callback) {
        callback(eventArgs);
    });
};

Reactor.prototype.addEventListener = function(eventName, callback) {
    this.events[eventName].registerCallback(callback);
};

var data = function() {
    var oneDay = 24 * 60 * 60 * 1000;
    var today = new Date();
    var reactor = new Reactor();
    reactor.registerEvent('dataLoaded');

    var date_format = 'MMM YYYY';

    var humanizeDuration = function(moment_obj, did_leave_company) {
        var days,
            months = moment_obj.months(),
            years = moment_obj.years(),
            month_str = months > 1 ? 'months' : 'month',
            year_str = years > 1 ? 'years' : 'year';

        if (months && years) {
            return years + ' ' + year_str + ' ' + months + ' ' + month_str;
        }

        if (months) {
            return months + ' ' + month_str;
        }

        if (years) {
            return years + ' ' + year_str;
        }

        if (did_leave_company) {
            days = moment_obj.days();

            return (days > 1 ? days + ' days' : days + ' day');
        } else {
            return 'Recently joined';
        }
    };

    var normalizeDates = function(parent, defaultEnd, defaultStart) {
        parent.forEach(function(d) {
            if (typeof d.startDate == "undefined" && typeof defaultStart != "undefined") {
                d.startDate = defaultStart;
            } else {
                d.startDate = new Date(d.startDate);
            }

            if (typeof d.endDate == "undefined") {
                d.endDate = defaultEnd;
            } else {
                d.endDate = new Date(d.endDate);
            }
        });
    };

    var interpolateExperience = function(date, type, list) {
        var langArray = list.get(type);
        if (date <= langArray[0].x) {
            return 0;
        } else if (date >= langArray[langArray.length - 1].x) {
            return langArray[langArray.length - 1].y;
        }
        for (var i = 0; i < langArray.length - 1; i++) {
            if (date >= langArray[i].x && date < langArray[i + 1].x) {
                return Math.min((langArray[i].y + (date - langArray[i].x) / oneDay), langArray[i + 1].y);
            }
        }
    };

    var normalizeProjectDates = function(rawDates) {
        var projectDates = [];
        var normalizedDates = d3.map();
        var chartData = [];

        for (var name in rawDates) {
            var language = rawDates[name];

            // Sort by start date
            language.sort(function(a, b) {
                if (a.startDate < b.startDate) { return -1; }
                if (a.startDate > b.startDate) { return 1; }
                return 0;
            });

            normalizedDates.set(name, []);
            var temp = normalizedDates.get(name);
            var start = null;
            var end = null;
            var days = 0;

            for (var i = 0; i < language.length; i++) {
                if (start === null) {
                    start = language[i].startDate;
                    end = language[i].endDate;
                } else if (language[i].startDate > end) {
                    temp.push({ x: start, y: days });
                    days += (end - start) / oneDay;
                    temp.push({ x: end, y: days });
                    start = language[i].startDate;
                    end = language[i].endDate;
                } else if (language[i].endDate > end) {
                    end = language[i].endDate;
                }
            }
            temp.push({ x: start, y: days });
            days += (end - start) / oneDay;
            temp.push({ x: end, y: days });
        }

        normalizedDates.forEach(function(d) {
            projectDates = _.union(projectDates, normalizedDates.get(d).map(function(d) { return d.x; }));
        });

        projectDates.sort(d3.ascending);

        projectDates.forEach(function(date) {
            var entry = { date: date };
            normalizedDates.forEach(function(lang) {
                entry[lang] = interpolateExperience(date, lang, normalizedDates);
            });
            chartData.push(entry);
        });

        return chartData;
    };

    var parseProjectComponent = function(work, area) {
        var components = [];

        data.hierarchy[area] = { name: "All " + _.capitalize(area) + " (click to drill down)", children: [] };
        var hierarchy = data.hierarchy[area].children;
        var filter = data.filter[area];

        work.forEach(function(job) {
            if (typeof job.projects != "undefined") {
                job.projects.forEach(function(project) {
                    if (typeof project[area] != "undefined" &&
                        _.intersection(project.capacities, filter).length > 0) {
                        project[area].forEach(function(component) {

                            // Collect the total days for this component of this area
                            var days = (project.endDate - project.startDate) / oneDay;
                            var totalEntry = _.find(job.total[area], function(t) { return t.name == component; });
                            if (typeof totalEntry === "undefined") {
                                totalEntry = { name: component, days: 0 };
                                job.total[area].push(totalEntry);
                            }
                            totalEntry.days += days;

                            var hierarchyEntry = _.find(hierarchy, function(t) { return t.name == component; });
                            if (typeof hierarchyEntry === "undefined") {
                                hierarchyEntry = { name: component, children: [] };
                                hierarchy.push(hierarchyEntry);
                            }
                            var companyName = component + " at " + job.company;
                            var jobEntry = _.find(hierarchyEntry.children, function(t) { return t.name == companyName; });
                            if (typeof jobEntry === "undefined") {
                                jobEntry = { name: companyName, children: [] };
                                hierarchyEntry.children.push(jobEntry);
                            }
                            jobEntry.children.push({ name: project.name, size: days / 365 });

                            (components[component] || (components[component] = [])).push({ startDate: project.startDate, endDate: project.endDate });
                        });
                    }
                });
            }
        });

        return normalizeProjectDates(components);
    };

    var parseRoles = function(work) {
        var roleNames = ["Manager", "Architect", "Developer", "Analyst"];
        var roles = [];
        roleNames.forEach(function(role) {
            roles[role] = { label: role, times: [] };
        });

        work.forEach(function(job) {
            if (typeof job.projects != "undefined") {
                job.projects.forEach(function(project) {
                    if (typeof project.capacities != "undefined") {
                        project.capacities.forEach(function(role) {
                            roles[role].times.push({ starting_time: project.startDate, ending_time: project.endDate, project: project.name + " (" + job.company + ")" });
                        });
                    }
                });
            }
        });

        // Find underscore function for this
        var returnVal = [];
        roleNames.forEach(function(role) {
            returnVal.push(roles[role]);
        });
        return returnVal;
    };

    var parseData = function(error, root) {
        data.resume = root;
        var work = root.work;

        _.each(work, function(work_info) {
            var did_leave_company,
                start_date = work_info.startDate && new Date(work_info.startDate),
                end_date = work_info.endDate && new Date(work_info.endDate);

            if (start_date) {
                work_info.prettyStart = moment(start_date).format(date_format);
            }

            if (end_date) {
                work_info.prettyEnd = moment(end_date).format(date_format);
            } else {
                work_info.prettyEnd = "Present";
            }

            did_leave_company = !!end_date;

            if (start_date) {
                end_date = end_date || new Date();
                work_info.duration = humanizeDuration(
                    moment.duration(end_date.getTime() - start_date.getTime()),
                    did_leave_company);
            }
        });

        _.each(root.education, function(education_info) {
            _.each(['startDate', 'endDate'], function(date) {
                var date_obj = new Date(education_info[date]);

                if (education_info[date]) {
                    education_info[date] = moment(date_obj).format(date_format);
                }
            });
        });

        _.each(root.skills, function(skill_info) {
            var levels = ['Beginner', 'Intermediate', 'Advanced', 'Master'];

            if (skill_info.level) {
                skill_info.skill_class = skill_info.level.toLowerCase();
                skill_info.level = _.capitalize(skill_info.level.trim());
                skill_info.display_progress_bar = _.contains(levels, skill_info.level);
            }
        });

        normalizeDates(work, today);

        work.forEach(function(job) {
            if (typeof job.projects != "undefined") {
                normalizeDates(job.projects, job.endDate, job.startDate);
            }
        });

        startDate = d3.min(work, function(d) { return d.startDate; });
        endDate = d3.max(work, function(d) { return d.endDate; });

        work.forEach(function(job) {
            job.total = { languages: [], tools: [], databases: [] };
        });

        // Clean up this little mess.
        data.languageChartData = parseProjectComponent(root.work, "languages");
        data.toolChartData = parseProjectComponent(root.work, "tools");

        data.roleData = parseRoles(root.work);
        data.isLoaded = true;
        data.prettyJSON = printAsPrettyJSON(data);

        reactor.dispatchEvent('dataLoaded');
    };

    var reloadLanguageData = function() {
        data.languageChartData = parseProjectComponent(data.resume.work, "languages");
    };

    var reloadToolData = function() {
        data.toolChartData = parseProjectComponent(data.resume.work, "tools");
    };

    var loadData = function() {
        d3.json("md-resume.json", parseData);
    };

    var reloadData = function(url) {
        d3.json(url, parseData);
    };

    var whenDataLoaded = function(callback) {
        if (data.isLoaded) {
            callback();
        } else {
            reactor.addEventListener('dataLoaded', function() {
                callback();
            });
        }
    };

    var printAsPrettyJSON = function(dt) {
        var cache = [];
        var prettyJSON = JSON.stringify(dt, function(key, value) {
            if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1) {
                    // Circular reference found, discard key
                    return;
                }
                // Store value in our collection
                cache.push(value);
            }
            return value;
        }, '\t');
        return prettyJSON;
    };


    var resumeColors = ["#9467bd", "#c5b0d5", "#1f77b4", "#aec7e8", "#ff7f0e", "#2ca02c", "#ffbb78", "#98df8a", "#d62728", "#ff9896", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"];

    loadData();

    return {
        languageChartData: [],
        languageColors: d3.scale.ordinal().range(resumeColors),
        toolChartData: [],
        toolColors: d3.scale.category20(),
        roleData: [],
        filter: {
            languages: ["Manager", "Architect", "Developer"],
            tools: ["Manager", "Architect", "Developer"]
        },
        hierarchy: {},
        isLoaded: false,
        reloadLanguageData: reloadLanguageData,
        reloadToolData: reloadToolData,
        reloadData: reloadData,
        whenDataLoaded: whenDataLoaded
    };
}();
visualResume.directive('donut', function() {

    var width = 300,
        height = 200,
        radius = 175 / 2;

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) {
            return d.days;
        });

    var arc = d3.svg.arc()
        .outerRadius(radius * 0.8)
        .innerRadius(radius * 0.3);

    var outerArc = d3.svg.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);

    var key = function(d) { return d.data.name; };

    var oldPieData = {};

    var pieTween = function(d, i) {

        var theOldDataInPie = oldPieData;
        // Interpolate the arcs in data space

        var s0;
        var e0;

        if (theOldDataInPie[i]) {
            s0 = theOldDataInPie[i].startAngle;
            e0 = theOldDataInPie[i].endAngle;
        } else if (!(theOldDataInPie[i]) && theOldDataInPie[i - 1]) {
            s0 = theOldDataInPie[i - 1].endAngle;
            e0 = theOldDataInPie[i - 1].endAngle;
        } else if (!(theOldDataInPie[i - 1]) && theOldDataInPie.length > 0) {
            s0 = theOldDataInPie[theOldDataInPie.length - 1].endAngle;
            e0 = theOldDataInPie[theOldDataInPie.length - 1].endAngle;
        } else {
            s0 = 0;
            e0 = 0;
        }

        var interpolate = d3.interpolate({
            startAngle: s0,
            endAngle: e0
        }, {
            startAngle: d.startAngle,
            endAngle: d.endAngle
        });

        return function(t) {
            var b = interpolate(t);
            return arc(b);
        };
    };

    var removePieTween = function(d, i) {
        s0 = 2 * Math.PI;
        e0 = 2 * Math.PI;
        var interpolate = d3.interpolate({
            startAngle: d.startAngle,
            endAngle: d.endAngle
        }, {
            startAngle: s0,
            endAngle: e0
        });

        return function(t) {
            var b = interpolate(t);
            return arc(b);
        };
    };

    var buildSvg = function(element) {
        return d3.select(element).append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    };

    var draw = function(data, svg, label, value, color) {

        var piedata = pie(data);

        //create a marker element if it doesn't already exist
        var defs = svg.select("defs");
        if (defs.empty()) {
            defs = svg.append("defs");
        }
        var marker = defs.select("marker#circ");
        if (marker.empty()) {
            defs.append("marker")
                .attr("id", "circ")
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("refX", 3)
                .attr("refY", 3)
                .append("circle")
                .attr("cx", 3)
                .attr("cy", 3)
                .attr("r", 3);
        }
        //Create/select <g> elements to hold the different types of graphics
        //and keep them in the correct drawing order
        var pathGroup = svg.select("g.piePaths");
        if (pathGroup.empty()) {
            pathGroup = svg.append("g")
                .attr("class", "piePaths");
        }
        var pointerGroup = svg.select("g.pointers");
        if (pointerGroup.empty()) {
            pointerGroup = svg.append("g")
                .attr("class", "pointers");
        }
        var labelGroup = svg.select("g.labels");
        if (labelGroup.empty()) {
            labelGroup = svg.append("g")
                .attr("class", "labels");
        }

        var path = pathGroup.selectAll("path.pie")
            .data(piedata);

        path.enter().append("path")
            .attr("class", "pie")
            .attr("fill", function(d, i) {
                return color(d.data.name);
            });

        path.transition()
            .duration(300)
            .attrTween("d", pieTween);

        path.exit()
            .transition()
            .duration(300)
            .attrTween("d", removePieTween)
            .remove();

        var labels = labelGroup.selectAll("text")
            .data(piedata
                .sort(function(p1, p2) { return p1.startAngle - p2.startAngle; })
            );
        labels.enter()
            .append("text")
            .attr("text-anchor", "middle");
        labels.exit()
            .remove();

        var labelLayout = d3.geom.quadtree()
            .extent([
                [-width, -height],
                [width, height]
            ])
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; })
            ([]); //create an empty quadtree to hold label positions
        var maxLabelWidth = 0;
        var maxLabelHeight = 0;

        labels.text(function(d) {
                // Set the text *first*, so we can query the size
                // of the label with .getBBox()
                return d.data.name;
            })
            .each(function(d, i) {
                // Move all calculations into the each function.
                // Position values are stored in the data object
                // so can be accessed later when drawing the line

                /* calculate the position of the center marker */
                var a = (d.startAngle + d.endAngle) / 2;

                //trig functions adjusted to use the angle relative
                //to the "12 o'clock" vector:
                d.cx = Math.sin(a) * (radius - 35);
                d.cy = -Math.cos(a) * (radius - 35);

                /* calculate the default position for the label,
                 so that the middle of the label is centered in the arc*/
                var bbox = this.getBBox();

                //bbox.width and bbox.height will
                //describe the size of the label text
                var labelRadius = radius + 10;
                d.x = Math.sin(a) * (labelRadius);
                d.l = d.x - bbox.width / 2 - 2;
                d.r = d.x + bbox.width / 2 + 2;
                d.y = -Math.cos(a) * (radius);
                d.b = d.oy = d.y + 5;
                d.t = d.y - bbox.height - 5;

                /* check whether the default position
                 overlaps any other labels*/
                var conflicts = [];
                labelLayout.visit(function(node, x1, y1, x2, y2) {
                    //recurse down the tree, adding any overlapping
                    //node is the node in the quadtree,
                    //node.point is the value that we added to the tree
                    //x1,y1,x2,y2 are the bounds of the rectangle that
                    //this node covers

                    if ((x1 > d.r + maxLabelWidth / 2) ||
                        //left edge of node is to the right of right edge of label
                        (x2 < d.l - maxLabelWidth / 2) ||
                        //right edge of node is to the left of left edge of label
                        (y1 > d.b + maxLabelHeight / 2) ||
                        //top (minY) edge of node is greater than the bottom of label
                        (y2 < d.t - maxLabelHeight / 2))
                    //bottom (maxY) edge of node is less than the top of label

                        return true; //don't bother visiting children or checking this node

                    var p = node.point;
                    var v = false,
                        h = false;
                    if (p) { //p is defined, i.e., there is a value stored in this node
                        h = (((p.l > d.l) && (p.l <= d.r)) ||
                            ((p.r > d.l) && (p.r <= d.r)) ||
                            ((p.l < d.l) && (p.r >= d.r))); //horizontal conflict

                        v = (((p.t > d.t) && (p.t <= d.b)) ||
                            ((p.b > d.t) && (p.b <= d.b)) ||
                            ((p.t < d.t) && (p.b >= d.b))); //vertical conflict

                        if (h && v)
                            conflicts.push(p); //add to conflict list
                    }
                });

                if (conflicts.length) {
                    //console.log(d, " conflicts with ", conflicts);
                    var rightEdge = d3.max(conflicts, function(d2) {
                        return d2.r;
                    });

                    //d.l = rightEdge;
                    //d.x = d.l + bbox.width / 2 + 5;
                    //d.r = d.l + bbox.width + 10;
                }
                //else console.log("no conflicts for ", d);

                /* add this label to the quadtree, so it will show up as a conflict
                 for future labels.  */
                labelLayout.add(d);
                var maxLabelWidth = Math.max(maxLabelWidth, bbox.width + 10);
                var maxLabelHeight = Math.max(maxLabelHeight, bbox.height + 10);
            })
            .transition() //we can use transitions now!
            .attr("x", function(d) {
                return d.x;
            })
            .attr("y", function(d) {
                return d.y;
            });

        var pointers = pointerGroup.selectAll("path.pointer")
            .data(piedata);

        pointers.enter()
            .append("path")
            .attr("class", "pointer")
            .style("fill", "none")
            .style("stroke", "black")
            .attr("marker-end", "url(#circ)");
        pointers.exit().remove();

        pointers.transition().attr("d", function(d) {
            if (d.cx > d.l) {
                return "M" + (d.l + 2) + "," + d.b + "L" + (d.r - 2) + "," + d.b + " " + d.cx + "," + d.cy;
            } else {
                return "M" + (d.r - 2) + "," + d.b + "L" + (d.l + 2) + "," + d.b + " " + d.cx + "," + d.cy;
            }
        });

        oldPieData = piedata;
    };

    function link(scope, element, attr) {
        data.whenDataLoaded(function() {

            scope.svg = buildSvg(element[0]);

            scope.lang = function() {
                draw(scope.langdata, scope.svg, 'name', 'days', data.languageColors);
            };
            scope.tools = function() {
                draw(scope.tooldata, scope.svg, 'name', 'days', data.toolColors);
            };
            scope.onInit({ interface: { open: scope.lang, tools: scope.tools } });

            draw(scope.langdata, scope.svg, 'name', 'days', data.languageColors);
        });

    }

    return {
        link: link,
        restrict: 'E',
        scope: { langdata: '=', tooldata: '=', jobnumber: '=', onInit: '&onInit' },
        template: "<form><ul class='select-donut'><li><input type='radio' ng-click='lang()' name='job{{jobnumber}}' id='langrad{{jobnumber}}' value='Languages' checked><label for='langrad{{jobnumber}}'>Languages</label></li><li><input type='radio'  ng-click='tools()'  name='job{{jobnumber}}'  id='toolrad{{jobnumber}}' value='Tools'/><label for='toolrad{{jobnumber}}'>Tools</label></li></ul></form>"
    };
});
visualResume.directive('hierarchicalBar', function() {

    var $container = $('.card-wrapper');

    var margin = { top: 30, right: 120, bottom: 0, left: 200 },
        width = $container.width() - margin.left - margin.right - 50,
        height = 200 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var barHeight = 20;

    var color = d3.scale.ordinal()
        .range(["steelblue", "#ccc"]);

    var duration = 750,
        delay = 25;

    var partition = d3.layout.partition()
        .value(function(d) { return d.size; });

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("top");

    var createSvg = function(scope, element) {

        var svg = d3.select(element).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("rect")
            .attr("class", "background")
            .attr("width", width)
            .attr("height", height)
            .on("click", function(d) { up(scope, d); });

        svg.append("g")
            .attr("class", "x axis");

        svg.append("g")
            .attr("class", "y axis")
            .append("line")
            .attr("y1", "100%");

        return svg;
    };


    function down(scope, d, i) {

        if (!d.children || this.__transition__) return;
        var end = duration + d.children.length * delay;

        updateHeader(scope, d);

        var exit = markAnyCurrentlyDisplayedBarsAsExiting(scope);

        // Entering nodes immediately obscure the clicked-on bar, so hide it.
        exit.selectAll("rect").filter(function(p) { return p === d; })
            .style("fill-opacity", 1e-6);

        // Enter the new bars for the clicked-on data.
        // Per above, entering bars are immediately visible.
        var enter = drawBar(scope, d)
            .attr("transform", stack(i))
            .style("opacity", 1);

        // Have the text fade-in, even though the bars are visible.
        // Color the bars as parents; they will fade to children if appropriate.
        enter.select("text").style("fill-opacity", 1e-6);
        enter.select("rect").style("fill", color(true));

        // Update the x-scale domain.
        x.domain([0, d3.max(d.children, function(d) { return d.value; })]).nice();

        // Update the x-axis.
        scope.svg.selectAll(".x.axis").transition()
            .duration(duration)
            .call(xAxis);

        // Transition entering bars to their new position.
        var enterTransition = enter.transition()
            .duration(duration)
            .delay(function(d, i) { return i * delay; })
            .attr("transform", function(d, i) { return "translate(0," + barHeight * i * 1.2 + ")"; });

        // Transition entering text.
        enterTransition.select("text")
            .style("fill-opacity", 1);

        // Transition entering rects to the new x-scale.
        enterTransition.select("rect")
            .attr("width", function(d) { return x(d.value); })
            .style("fill", function(d) { return color(!!d.children); });

        // Transition exiting bars to fade out.
        var exitTransition = exit.transition()
            .duration(duration)
            .style("opacity", 1e-6)
            .remove();

        // Transition exiting bars to the new x-scale.
        exitTransition.selectAll("rect")
            .attr("width", function(d) { return x(d.value); });

        // Rebind the current node to the background.
        scope.svg.select(".background")
            .datum(d)
            .transition()
            .duration(end);

        d.index = i;
    }

    function up(scope, d) {
        if (!d.parent || this.__transition__) return;

        updateHeader(scope, d.parent);

        var end = duration + d.children.length * delay;

        var exit = markAnyCurrentlyDisplayedBarsAsExiting(scope);

        // Enter the new bars for the clicked-on data's parent.
        var enter = drawBar(scope, d.parent)
            .attr("transform", function(d, i) { return "translate(0," + barHeight * i * 1.2 + ")"; })
            .style("opacity", 1e-6);

        // Color the bars as appropriate.
        // Exiting nodes will obscure the parent bar, so hide it.
        enter.select("rect")
            .style("fill", function(d) { return color(!!d.children); })
            .filter(function(p) { return p === d; })
            .style("fill-opacity", 1e-6);

        // Update the x-scale domain.
        x.domain([0, d3.max(d.parent.children, function(d) { return d.value; })]).nice();

        // Update the x-axis.
        scope.svg.selectAll(".x.axis").transition()
            .duration(duration)
            .call(xAxis);

        // Transition entering bars to fade in over the full duration.
        var enterTransition = enter.transition()
            .duration(end)
            .style("opacity", 1);

        // Transition entering rects to the new x-scale.
        // When the entering parent rect is done, make it visible!
        enterTransition.select("rect")
            .attr("width", function(d) { return x(d.value); })
            .each("end", function(p) { if (p === d) d3.select(this).style("fill-opacity", null); });

        // Transition exiting bars to the parent's position.
        var exitTransition = exit.selectAll("g").transition()
            .duration(duration)
            .delay(function(d, i) { return i * delay; })
            .attr("transform", stack(d.index));

        // Transition exiting text to fade out.
        exitTransition.select("text")
            .style("fill-opacity", 1e-6);

        // Transition exiting rects to the new scale and fade to parent color.
        exitTransition.select("rect")
            .attr("width", function(d) { return x(d.value); })
            .style("fill", color(true));

        // Remove exiting nodes when the last child has finished transitioning.
        exit.transition()
            .duration(end)
            .remove();

        // Rebind the current parent to the background.
        scope.svg.select(".background")
            .datum(d.parent)
            .transition()
            .duration(end);
    }

    // Creates a set of bars for the given data node, at the specified index.
    function drawBar(scope, d) {
        var bar = scope.svg.insert("g", ".y.axis")
            .attr("class", "enter")
            .attr("transform", "translate(0,5)")
            .selectAll("g")
            .data(d.children)
            .enter().append("g")
            .style("cursor", function(d) { return !d.children ? null : "pointer"; })
            .on("click", function(d) { down(scope, d); });

        bar.append("text")
            .attr("x", -6)
            .attr("y", barHeight / 2)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function(d) { return d.name; });

        bar.append("rect")
            .attr("width", function(d) { return x(d.value); })
            .attr("height", barHeight);

        return bar;
    }

    // A stateful closure for stacking bars horizontally.
    function stack(i) {
        var x0 = 0;
        return function(d) {
            var tx = "translate(" + x0 + "," + barHeight * i * 1.2 + ")";
            x0 += x(d.value);
            return tx;
        };
    }

    function markAnyCurrentlyDisplayedBarsAsExiting(scope) {
        return scope.svg.selectAll(".enter").attr("class", "exit");
    }

    function updateHeader(scope, node) {
        scope.header.text(node.name);
    }

    function link(scope, element, attr) {
        var hierarchyName = scope.datasource;
        data.whenDataLoaded(function() {
            scope.hierarchy = data.hierarchy[hierarchyName];
            height = Math.max(scope.hierarchy.children.length, 8) * barHeight * 1.2;
            scope.svg = createSvg(scope, element[0]);
            scope.header = d3.select(element[0]).select(".barHeader");
            partition.nodes(scope.hierarchy);
            x.domain([0, scope.hierarchy.value]).nice();
            down(scope, scope.hierarchy, 0);
        });
    }

    return {
        link: link,
        restrict: 'E',
        scope: { datasource: '@' },
        template: '<h4><div class="barHeader">Foo</div></h4>'
    };
});
var drawAreaChart;

(function() {
    var isPopoupStillInView = function(el) {
        var rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    var fadeIn = function(d) {

        var pos = d3.mouse(this);
        console.log(d);

        $("#pop-up").fadeOut(100, function() {
            $("#pop-up-title").html(d.name);
            $("#pop-up-list").html("");
            var entry = _.find(data.hierarchy.languages.children, function(i) { return i.name == d.name; });
            if (typeof(entry) === "undefined") {
                entry = _.find(data.hierarchy.tools.children, function(i) { return i.name == d.name; });
            }
            var items = _.map(entry.children, function(c) {
                var start = c.name.indexOf(" at ");
                return c.name.substr(start + 4);
            });
            $.each(items, function(i, item) {
                $("#pop-up-list").append("<li>" + item + "</li>");
            });

            var popLeft = pos[0] + "px";
            var popTop = pos[1] + "px";
            $("#pop-up").css({ left: popLeft, top: popTop, position: "fixed" });
            $("#pop-up").fadeIn(100);
        });
    };

    var fadeOut = function(d) {
        $("#pop-up").fadeOut(50);
    };

    drawAreaChart = function(elementId, chartData, colors) {
        var $container = $('.card-wrapper');
        var margin = { top: 20, right: 100, bottom: 30, left: 50 };
        var width = $container.width() - margin.left - margin.right - 75;
        var height = 500 - margin.top - margin.bottom;

        var startDate = chartData[0].date;
        var endDate = chartData[chartData.length - 1].date;

        var x = d3.time.scale()
            .domain([startDate, endDate])
            .range([0, width]);

        var yMax = 0;

        _.each(chartData[chartData.length - 1], function(d, k) {
            if (k != "date") {
                yMax = yMax + d;
            }
        });

        var y = d3.scale.linear()
            .domain([yMax, 0])
            .range([0, height]);

        var keys = d3.keys(chartData[0]).filter(function(key) {
            return key !== "date";
        });
        keys.reverse();
        var color = colors.domain(keys);

        var area = d3.svg.area()
            .x(function(d) {
                return x(d.date);
            })
            .y0(function(d) {
                return y(d.y0);
            })
            .y1(function(d) {
                return y(d.y0 + d.y);
            });

        var stack = d3.layout.stack()
            .values(function(d) {
                return d.values;
            });

        d3.select(elementId).selectAll("svg").remove();

        var svg = d3.select(elementId).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var items = stack(color.domain().map(function(name) {
            return {
                name: name,
                values: chartData.map(function(d) {
                    return { date: d.date, y: d[name] };
                })
            };
        }));

        var item = svg.selectAll(".item")
            .data(items)
            .enter().append("g")
            .attr("class", "item");

        item.append("path")
            .attr("class", "area")
            .attr("d", function(d) {
                return area(d.values);
            })
            .style("fill", function(d) {
                return color(d.name);
            })
            .on("mouseover", fadeIn)
            .on("mouseout", fadeOut);

        item.append("text")
            .datum(function(d) {
                return { name: d.name, value: d.values[d.values.length - 1] };
            })
            .attr("transform", function(d) {
                return "translate(" + x(d.value.date) + "," + y(d.value.y0 + d.value.y / 4) + ")";
            })
            .attr("x", 0)
            .attr("dy", ".35em")
            .text(function(d) {
                return d.name;
            });

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
    };

    var setFilterHook = function() {
        d3.selectAll(".filterButtonLanguage").on("change", function() {
            if (this.checked) {
                data.filter.languages.push(this.name);
            } else {
                var i = data.filter.languages.indexOf(this.name);
                data.filter.languages.splice(i, 1);
            }
            data.reloadLanguageData();
            drawAreaChart('#languageChart', data.languageChartData, data.languageColors);
        });
        d3.selectAll(".filterButtonTool").on("change", function() {
            if (this.checked) {
                data.filter.tools.push(this.name);
            } else {
                var i = data.filter.tools.indexOf(this.name);
                data.filter.tools.splice(i, 1);
            }
            data.reloadToolData();
            drawAreaChart('#toolChart', data.toolChartData, data.toolColors);
        });
    };

    data.whenDataLoaded(function() {
        drawAreaChart('#languageChart', data.languageChartData, data.languageColors);
        drawAreaChart('#toolChart', data.toolChartData, data.toolColors);
        setFilterHook();
    });
})();
visualResume.directive('rolesChart', function() {

    var drawRolesTimeline = function(data, elem) {

        var $container = $('.card-wrapper');
        var width = $container.width() - 70;
        var hoverDiv = $('#hoverRes');
        var coloredDiv = hoverDiv.find('.coloredDiv');
        var nameDiv = hoverDiv.find('#name');

        var chart = d3.timeline()
            .width(width)
            .stack()
            .margin({ left: 70, right: 30, top: 0, bottom: 0 })
            .hover(function(d, i, datum) {
                var colors = chart.colors();
                coloredDiv.css('background-color', colors(i));
                nameDiv.html("&nbsp;" + d.project);
            })
            .mouseout(function() {
                coloredDiv.css('background-color', '');
                nameDiv.html("");
            })
            .click(function(d, i, datum) {
                //alert(d.project);
            });

        var svg = d3.select(elem).insert("svg", ":first-child").attr("width", width)
            .datum(data).call(chart);
    };

    function link(scope, element, attr) {
        data.whenDataLoaded(function() {
            drawRolesTimeline(data.roleData, element[0]);
        });
    }

    return {
        link: link,
        template: '<div id="hoverRes"><div class="coloredDiv"></div><div id="name"></div></div>',
        restrict: 'E'
    };
});