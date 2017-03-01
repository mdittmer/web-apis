'use strict';

require('../../lib/foam/foam_models.es6.js');
var app = angular.module('webCatalog', ["ngRoute"]);

app.config(function($routeProvider) {
  $routeProvider
  .when("/", {
    templateUrl: "api_catalog.html",
    controller: "apiCatalogController"
  })
  .when("/history", {
    templateUrl: "api_history.html",
    controller: "historyController"
  });
});

app.service("serverDAO",
  ["$http", function($http) {
    this.mockServerDAO = WebAPIs.create();
    this.fetch = keys => {
      return new Promise(function(resolve, reject) {
        var promises = [];
        for (let i = 0; i < keys.length; i += 1) {
          let key = keys[i];
          if (!this.mockServerDAO.haveBrowser(key)) {
            let browserInfo = key.split(' ');
            let browserName = browserInfo[0];
            let browserVersion = browserInfo[1];
            let browserOS = browserInfo[2];
            let osVersion = browserInfo[3];
            promises.push($http.get(`/web-api-catalog/${key}`).then(function(res) {
              this.mockServerDAO.importAPI(browserName, browserVersion, browserOS, osVersion, res.data);
            }.bind(this)));
          }
        }
        Promise.all(promises).then(function() {
          this.mockServerDAO.getBrowserAPIs(keys).then(arrayDao => resolve(arrayDao));
        }.bind(this));
      }.bind(this));
    };
    this.getBroserDict = _ => this.mockServerDAO.browsers;
    this.getAPIDict = _ => this.mockServerDAO.apiDict;

  }])

app.service("webAPIs",
  ["serverDAO", function(serverDAO) {
    this.cacheMap = {};
    this.browserAPIs = WebAPIs.create();
    this.fetch = function(keys) {
      return new Promise (function(resolve, reject) {
        keys = keys.filter(key => !this.cacheMap[key]);
        serverDAO.fetch(keys).then(function(apis) {
          for (let i = 0; i < apis.length; i += 1) {
            let api = apis[i];
            this.browserAPIs.browserAPIs.put(api);
          }
          this.browserAPIs.browsers = serverDAO.getBroserDict();
          this.browserAPIs.apiDict = serverDAO.getAPIDict();
          for (let i = 0; i < keys.length; i += 1) {
            this.cacheMap[keys[i]] = true;
          }
          resolve();
        }.bind(this));
      }.bind(this));
    };
  }]);

app.controller("apiCatalogController",
  ["$scope", "$http", "webAPIs", function($scope, $http, webAPIs) {
    // Activate dropdown and tabs.
    angular.element(".dropdown-button").dropdown();
    angular.element('ul.tabs').tabs();
    $scope.Math = window.Math;
    $scope.showRows = {}; // Record which interfaces' api are expanded.
    $scope.apiCatalogMap = {};
    $scope.searchResult = {}; // Displayed apiCatalog.
    $scope.currentPage = 0;
    $scope.itemPerPage = 0;
    $scope.totalAPI = 0;
    $scope.analyticsResult = null;
    $scope.views = [];
    var browserKeys = [];

    $http.get('/list/og').then(function(res) {
      var browsersArr = res.data;
      $scope.allBrowsers = browsersArr;
    });

    function alertError(errorMsg) {
      Materialize.toast(errorMsg, 4000)
    }

    $scope.setPageLength = function() {
      $scope.currentPage = 0;
      $scope.gap = 5;
      $scope.itemPerPage = 15;
      $scope.pageLength = Math.ceil(Object.keys($scope.searchResult).length / $scope.itemPerPage);
    };

    $scope.getInterfaceRange = function() {
      return Object.keys($scope.searchResult).sort().slice(
        $scope.currentPage * $scope.itemPerPage,
        ($scope.currentPage + 1) * $scope.itemPerPage);
    };

    $scope.removeBrowser = function(browserKey) {
      var index = browserKeys.indexOf(browserKey);
      if (index > -1) {
        browserKeys.splice(index, 1);
      }
      webAPIs.browserAPIs.toMap(browserKeys).then(map => {
        $scope.apiCatalogMap = map;
        $scope.searchResult = map;
        $scope.setPageLength();
        // Call apply to update view.
        $scope.$apply();
      });
      webAPIs.browserAPIs.getAnalytics(browserKeys).then(result => {
        $scope.analyticsResult = result;
        $scope.totalAPI = result.total;
        $scope.$apply();
      });
    };

    $scope.showCatalog = function(key) {
      if ($scope.showRows[key]) {
        $scope.showRows[key] = false;
      } else {
        $scope.showRows[key] = true;
      }
    };

    $scope.range = function(size, current) {
      var ret = [];
      var start = current - 2;
      if (start < 0) start = 0;
      var end = start + $scope.gap;
      if (end > size) {
        end = size;
        start = size - $scope.gap;
        if (start < 0) start = 0;
      }
      for (var i = start; i < end; i++) {
        ret.push(i);
      }
      return ret;
    };

    $scope.setPage = function(p) {
      if ($scope.currentPage === undefined) return;
      if (p < 0 || p >= $scope.pageLength) return;
      $scope.currentPage = p;
    };

    $scope.search = function(event) {
      event.preventDefault();
      var key = $scope.searchKey;
      if (!key) {
        $scope.searchResult = $scope.apiCatalogMap;
        $scope.setPageLength();
        return;
      }
      if (!$scope.apiCatalogMap) {
        return;
      }
      $scope.searchResult = {};
      webAPIs.browserAPIs.searchKeyWord(key, browserKeys).then(result => {
        $scope.searchResult = result;
        $scope.setPageLength();
        $scope.$apply();
      });
    };

    $scope.downloadCSV = function(args) {
      var filename = 'result.csv';
      webAPIs.browserAPIs.toCSV(browserKeys).then(csv => {
        if (csv === null) return;
        if (!csv.match(/^data:text\/csv/i)) {
          csv = 'data:text/csv;charset=utf-8,' + csv;
        }
        var data = encodeURI(csv);
        var link = document.createElement('a');
        link.setAttribute('href', data);
        link.setAttribute('download', filename);
        link.click();
      });
    };

    $scope.addToCompare = function(browser) {
      if (browserKeys.indexOf(browser) >= 0) {
        alertError('This browser is already selected.');
        return;
      }
      $scope.selectedBrowser = undefined;
      browserKeys.push(browser);
      webAPIs.fetch([browser]).then(_ => {
        webAPIs.browserAPIs.toMap(browserKeys).then(map => {
          $scope.apiCatalogMap = map;
          $scope.searchResult = map;
          $scope.setPageLength();
          // Call apply to update view.
          $scope.$apply();
        });
        webAPIs.browserAPIs.getAnalytics(browserKeys).then(result => {
          $scope.analyticsResult = result;
          $scope.totalAPI = result.total;
          $scope.$apply();
          // ******************* D3 TEST *******************
          if (result.table[0].length < 2) return;
          var visualResult = [];
          for (let i = 0; i < result.table[0].length; i += 1) {
            visualResult.push({
              total: result.table[0][i],
              proprietary: result.table[1][i][0],
              nonExist: result.table[result.table.length - 2][i][1]
            });
          }
          var width = 720;
          var height = 360;
          var margin = 25;
          // Clear view by setting html to empty.
          d3.select(".chart").html("");

          var chart = d3.select(".chart")
              .attr("width", width)
              .attr("height", height);

          var circle = chart.selectAll("circle")
              .data(visualResult);

          var circleEnter = circle.enter().append("circle")
            .style("fill", "steelblue").attr("cy", function(d) {
              return (height - 2 * margin) * d.nonExist / result.total + margin;
            }).attr("cx", function(d) {
              return (width - 2 * margin) * d.proprietary / result.total + margin;
            }).attr("r", function(d) {
              return (d.total / result.total) * 20;
            });
          var xAxis = d3.scaleLinear().domain([0, 1]).range([margin, width - margin]);
          var axisBtm = d3.axisBottom(xAxis);

          chart.append("g")
            .attr("transform", "translate(0," + (height - margin) + ")")
            .call(axisBtm);

          var yAxis = d3.scaleLinear().domain([0, 1]).range([margin, height - margin]);
          var axisLeft = d3.axisLeft(yAxis);
          chart.append("g")
            .attr("transform", "translate(" + margin + ", 0)")
            .call(axisLeft);
          // ***********************************************
        }); // TODO
      });
    };

    $scope.newView = function(numOverlap, browserIndex, have) {
      webAPIs.browserAPIs.getFilteredMapByOverlap(numOverlap,
        $scope.analyticsResult.header[browserIndex], have, browserKeys)
      .then(result => {
        $scope.views.push(result);
        $scope.$apply();
      });
    };
  }]);

app.controller('filteredViewController',
  ['$scope', function($scope) {
    $scope.showRows = {};
    $scope.view = $scope.$parent.views[$scope.$parent.$index];
    $scope.Object = Object;
    $scope.showCatalog = function(key) {
      if ($scope.showRows[key]) {
        $scope.showRows[key] = false;
      } else {
        $scope.showRows[key] = true;
      }
    };
  }]);

app.controller('historyController',
  ['$scope', '$http', 'webAPIs', function($scope, $http, webAPIs) {
    $http.get('/list/og').then(function(res) {
      angular.element('ul.tabs').tabs();
      $scope.progress = "0%";
      var historyMeta = null;
      var browsersArr = res.data;
      // var numComplete = 0;
      var majorBrowsers = ["Chrome", "Firefox", "Edge", "Safari"];
      var promises = [];
      promises.push(webAPIs.fetch(browsersArr).then(_ => {
        $scope.progress = "100%";
      }));

      // Read browser history meta data.
      promises.push($http.get("/browser-version-history").then(res => {
        historyMeta = res.data;
      }));

      // Wait all promises finish.
      Promise.all(promises).then(_ => {
        for (let i = 0; i < majorBrowsers.length; i += 1) {
          let browserName = majorBrowsers[i];
          let browserHistory = historyMeta[browserName];
          let versions = Object.keys(browserHistory);
          promises = [];
          let releaseDates = [];
          let browserKey = null;
          for (let j = 0; j < versions.length; j += 1) {
            let prevKey = browserKey;
            let version = versions[j];
            let thisKey = webAPIs.browserAPIs.getBrowserKeys(browserName, version)[0];
            browserKey = thisKey;
            // Get first key for testing.
            if (thisKey) releaseDates.push(new Date(browserHistory[version]));
            if (thisKey && prevKey) {
              promises.push(webAPIs.browserAPIs.diff(prevKey, thisKey));
            }
          }
          Promise.all(promises).then(results => {
            var versionAPIDiffs = [];
            for (let j = 0; j < releaseDates.length; j += 1) {
              let versionData = {};
              let releaseDate = releaseDates[j];
              if (j === releaseDates.length - 1) {
                versionData.total = results[j - 1].total[1];
                versionData.key = results[j - 1].keys[1];
              } else {
                versionData.total = results[j].total[0];
                versionData.key = results[j].keys[0];
              }
              if (j === 0) {
                versionData.plus = 0;
                versionData.minus = 0;
              } else {
                versionData.plus = results[j - 1].diffs[1];
                versionData.minus = results[j - 1].diffs[0];
              }
              versionData.releaseDate = releaseDate;
              versionAPIDiffs.push(versionData);
            }
            buildAPIDiffChart(versionAPIDiffs, ".APIDiffCharts",
              `${browserName} API diff history`);
          });
        }
      });
    });
  }]);

function buildAPIDiffChart(versionAPIDiffs, target, title) {
  var width = 720;
  var height = 360;
  var margin = {top: 20, right: 50, bottom: 30, left: 50};
  // Create a sub div inside charts div.
  var div = d3.select(target).append("div");
  // Create an svg element inside div.
  var svg = div.append("svg")
    .attr("width", width)
    .attr("height", height);
  // Append title to SVG.
  svg.append("text")
    .attr("x", (width / 2))
    .attr("y", margin.top)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("text-decoration", "underline")
    .text(title);
  // Set actual chart width and height.
  width = svg.attr("width") - margin.left - margin.right;
  height = svg.attr("height") - margin.top - margin.bottom;
  // Create a g element inside svg, which will contain all paths and areas.
  var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  var rightAxisUpperBound = Math.ceil(d3.max(versionAPIDiffs, d => d.total + d.minus) / 500) * 500;
  var rightAxisLowerBound = Math.floor(d3.min(versionAPIDiffs, d => d.total - d.plus) / 500) * 500;
  // X axis is release date.
  var x = d3.scaleTime()
    .rangeRound([0, width])
    .domain(d3.extent(versionAPIDiffs, d => d.releaseDate));
  // Y axis is number of APIs.
  var y = d3.scaleLinear()
    .rangeRound([height, 0])
    .domain([rightAxisLowerBound, rightAxisUpperBound]);
  // Append tooltip div inside chart div. (cannot append div inside svg)
  var tooltips = div.append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  // Total number of APIs' area.
  var areaTotal = d3.area()
    .x(d => x(d.releaseDate))
    .y1(d => y(d.total))
    .y0(y(rightAxisLowerBound));
  // Number of removed APIs.
  var areaMinus = d3.area()
    .x(d => x(d.releaseDate))
    .y1(d => y(d.total + d.minus))
    .y0(d => y(d.total));
  // Number of new APIs.
  var areaPlus = d3.area()
    .x(d => x(d.releaseDate))
    .y1(d => y(d.total))
    .y0(d => y(d.total - d.plus));
  // Create dot where tooltips are displayed.
  svg.selectAll("dot")
    .data(versionAPIDiffs)
    .enter().append("circle")
      .attr("r", 5)
      .attr("cx", d => x(d.releaseDate) + margin.left)
      .attr("cy", d => y(d.total) + margin.top)
        .on("mouseover", function(d) {
          tooltips.transition()
            .duration(200)
            .style("opacity", .9);
          tooltips.html(d.key + "<br/> total API:" +
            d.total + "<br/> plus:" + d.plus + "<br/> minus:" + d.minus)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
          tooltips.transition()
            .duration(500)
            .style("opacity", 0);
        });
  g.append("path")
    .datum(versionAPIDiffs)
    .attr("fill", "steelblue")
    .style("opacity", .2)
    .attr("d", areaTotal);
  g.append("path")
    .datum(versionAPIDiffs)
    .attr("fill", "green")
    .style("opacity", .2)
    .attr("d", areaPlus);
  g.append("path")
    .datum(versionAPIDiffs)
    .attr("fill", "red")
    .style("opacity", .2)
    .attr('d', areaMinus);
  g.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("fill", "#000")
    .attr("y", 6)
    .attr("dy", "0.71em")
    .attr("text-anchor", "end")
    .text("#APIs");
}
