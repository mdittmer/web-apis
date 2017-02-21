'use strict';

require('../../lib/foam/foam_models.es6.js');
var app = angular.module('webCatalog', ["ngRoute"]);

app.config(function($routeProvider){
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

app.controller('apiCatalogController',
  ['$scope', '$http', function($scope, $http) {
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
    var browserSet = Browsers.create();
    var apiCatalog = null;

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
      return Object.keys($scope.searchResult).slice(
        $scope.currentPage * $scope.itemPerPage,
        ($scope.currentPage + 1) * $scope.itemPerPage);
    };

    $scope.removeBrowser = function(browserKey) {
      browserSet.removeBrowser(browserKey);
      $scope.setPageLength();
      apiCatalog = browserSet.getAPICatalog();
      apiCatalog.toMap().then(map => {
        $scope.apiCatalogMap = map;
        $scope.searchResult = map;
        $scope.setPageLength();
        // Call apply to update view.
        $scope.$apply();
      });
      apiCatalog.getAnalytics().then(result => {
        $scope.analyticsResult = result.result;
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
      }
      if (!$scope.apiCatalogMap) {
        return;
      }
      $scope.searchResult = {};
      apiCatalog.getFilteredMap(o => {
        return o.interface.toLowerCase().indexOf(key.toLowerCase()) >= 0 ||
          o.api.toLowerCase().indexOf(key.toLowerCase()) >= 0;
      }).then(result => {
        $scope.searchResult = result;
        $scope.setPageLength();
        $scope.$apply();
      });
    };

    $scope.downloadCSV = function(args) {
      var filename = 'result.csv';
      apiCatalog.toCSV().then(csv => {
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
      if (browserSet.haveBrowser(browser)) {
        alertError('This browser is already selected.');
        return;
      }
      $scope.selectedBrowser = undefined;
      let browserInfo = browser.split(' ');
      let browserName = browserInfo[0];
      let browserVersion = browserInfo[1];
      let browserOS = browserInfo[2];
      let OSversion = browserInfo[3];
      $http.get(`/web-api-catalog/${browser}`).then(res => {
        var apiCat = res.data;
        var browser = BrowserAPI.create({name: browserName, version: browserVersion,
          os: browserOS, os_version: OSversion, interfaces: apiCat});
        browserSet.push(browser);
        apiCatalog = browserSet.getAPICatalog();
        apiCatalog.toMap().then(map => {
          $scope.apiCatalogMap = map;
          $scope.searchResult = map;
          $scope.setPageLength();
          // Call apply to update view.
          $scope.$apply();
        });
        apiCatalog.getAnalytics().then(result => {
          $scope.analyticsResult = result.result;
          $scope.totalAPI = result.total;
          $scope.$apply();
          // ******************* D3 TEST *******************
          if (result.result[0].length < 2) return;
          var visualResult = [];
          for (let i = 0; i < result.result[0].length; i += 1) {
            visualResult.push({
              total: result.result[0][i],
              proprietary: result.result[1][i][0],
              nonExist: result.result[result.result.length - 2][i][1]
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
        });
      });
    };

    $scope.newView = function(numOverlap, browserIndex, have) {
      apiCatalog.getFilteredMap(o => {
        return o.result.filter(api => api).length === numOverlap &&
          o.result[browserIndex] === have;
      }).then(result => {
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
  ['$scope', '$http', function($scope, $http) {
    $http.get('/list/og').then(function(res) {
      $scope.progress = "0%";
      var browserHistories = {};
      var browsersArr = res.data;
      for (let i = 0; i < browsersArr.length; i += 1) {
        var browser = browsersArr[i];
        var browserInfo = browser.split(' ');
        if (!browserHistories[browserInfo[0]]) {
          browserHistories[browserInfo[0]] = BrowserHistory.create({browserName: browserInfo[1]});
        }
        var numComplete = 0;
        $http.get(`/web-api-catalog/${browser}`).then(res => {
          browserHistories[browserInfo[0]].addHistory(browserInfo[2], res.data);
          numComplete += 1;
          $scope.progress = Math.floor((numComplete / browsersArr.length) * 100) + "%";
          console.log(`/web-api-catalog/${browser}`);
          if (numComplete === browsersArr.length) {
            console.log(browserHistories);
          }
        });
      }
    });
  }]);
