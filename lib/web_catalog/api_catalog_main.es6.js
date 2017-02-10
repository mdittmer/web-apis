'use strict';

require('../../lib/foam/foam_models.es6.js');

angular.module('webCatalog', [])
  .controller('mainController',
  ['$scope', '$http', function($scope, $http) {
    $scope.showRows = {};
    $scope.apiCatalog = null;
    $scope.searchResult = {};
    $scope.currentPage = 0;
    $scope.itemPerPage = 0;
    var browserSet = Browsers.create();

    $http.get('/list/og').then(function(res) {
      var browsersArr = res.data;
      $scope.allBrowsers = browsersArr;
    });

    function alertError(errorMsg) {
      $scope.error = errorMsg;
      setTimeout(function() {
        $scope.error = null;
        $scope.$apply();
      }, 3000);
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
      $scope.apiCatalog = browserSet.getInterfaceAPIMap();
      $scope.searchResult = $scope.apiCatalog;
      $scope.setPageLength();
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
      }
      for (var i = start; i < end; i++) {
        ret.push(i);
      }
      return ret;
    };

    $scope.setPage = function(p) {
      if ($scope.currentPage === undefined) return;
      $scope.currentPage = p;
    };

    $scope.search = function() {
      var key = $scope.searchKey;
      if (!key) {
        $scope.searchResult = $scope.apiCatalog;
      }
      if (!$scope.apiCatalog) {
        return;
      }
      $scope.searchResult = {};
      var interfaces = Object.keys($scope.apiCatalog);
      for (let i = 0; i < interfaces.length; i += 1) {
        let jsInterface = interfaces[i];
        if (jsInterface === '_header') continue;
        if (jsInterface.indexOf(key) >= 0) {
          $scope.searchResult[jsInterface] = $scope.apiCatalog[jsInterface];
          continue;
        }
        var apis = Object.keys($scope.apiCatalog[jsInterface]);
        for (let j = 0; j < apis.length; j += 1) {
          var api = apis[j];
          if (api.indexOf(key) >= 0) {
            if (!$scope.searchResult[jsInterface]) {
              $scope.searchResult[jsInterface] = {};
            }
            $scope.searchResult[jsInterface][api] = $scope.apiCatalog[jsInterface][api];
          }
        }
      }
      $scope.setPageLength();
    };

    $scope.downloadCSV = function(args) {
      var filename = 'result.csv';
      var csv = browserSet.getFullTable().toCSV();
      if (csv === null) return;
      if (!csv.match(/^data:text\/csv/i)) {
        csv = 'data:text/csv;charset=utf-8,' + csv;
      }
      var data = encodeURI(csv);
      var link = document.createElement('a');
      link.setAttribute('href', data);
      link.setAttribute('download', filename);
      link.click();
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
        $scope.apiCatalog = browserSet.getInterfaceAPIMap();
        $scope.searchResult = $scope.apiCatalog;
        $scope.setPageLength();
      });
    };
  }]);
