'use strict';

var app = angular.module('myApp.logs.directives', []);

app.directive('logging', ['Logs', 'Location', 'Box', '$routeParams', 'gettextCatalog', 'pagination_labels', '$pusher', '$rootScope', '$location', '$mdDialog', 'showToast', function(Logs, Location, Box, $routeParams, gettextCatalog, pagination_labels, $pusher, $rootScope, $location, $mdDialog, showToast) {

  var link = function(scope,element,attrs,controller) {

    scope.loading  = true;
    var ap_mac = $routeParams.ap_mac;

    scope.pagination_labels = pagination_labels;
    scope.query = {
      // order:   '-timestamp',
      query:   $routeParams.q,
      limit:   $routeParams.per,
      // page:    $routeParams.page || 1,
      options: [5,10,25,50,100],
    };

    $routeParams.start || $routeParams.end ? scope.date_range = true : scope.date_range = false;

    var boxes = {};
    var location;

    var fetchBoxes = function() {
      Box.get({location_id: $routeParams.id}).$promise.then(function(results) {
        for (var i = 0, len = results.boxes.length; i < len; i++) {
          boxes[results.boxes[i].calledstationid] = results.boxes[i].description;
        }
      });
    };

    var setApNames = function() {
      for (var i = 0, len = scope.logs.length; i < len; i++) {
        scope.logs[i].ap_name = boxes[scope.logs[i].ap_mac];
      }
    };

    // scope.onPaginate = function (page, limit) {
    //   scope.query.page = page;
    //   scope.query.limit = limit;
    //   updatePage();
    // };

    scope.expandRow = function(log) {
      if (log.show_detail && log.show_detail === true) {
        log.show_detail = false;
      } else {
        log.show_detail = true;
      }
    };

    scope.updatePage = function(page) {
      var hash  = {};
      hash.start = scope.start;
      hash.end   = scope.end;
      // hash.page  = scope.query.page;
      hash.per   = scope.query.limit;
      hash.q     = scope.query.query;
      $location.search(hash);
    };

    var start_time;
    var end_time;

    if ($routeParams.start && $routeParams.end && $routeParams.end - $routeParams.start <= 3600) {
      start_time = $routeParams.start;
      end_time = $routeParams.end;
    } else {
      if ($routeParams.end - $routeParams.start > 3600) {
        showToast(gettextCatalog.getString('Period should not be longer than an hour'));
      } else if ($routeParams.start || $routeParams.end) {
        showToast(gettextCatalog.getString('Selected range period not valid'));
      }
      start_time = Math.round((new Date().getTime() - 60*60*1000) / 1000);
      end_time = Math.round((new Date().getTime()) / 1000);
    }

    function rangeCtrl($scope, startFull, endFull) {
      $scope.startFull = startFull;
      $scope.endFull = endFull;
      $scope.page = 'show';
      $scope.saveRange = function() {
        if ($scope.startFull && $scope.endFull) {
          // converting the moment picker time format - this could really do with some work:
          var startTimestamp = Math.floor(moment($scope.startFull).utc().toDate().getTime() / 1000);
          var endTimestamp = Math.floor(moment($scope.endFull).utc().toDate().getTime() / 1000);
          if (startTimestamp > endTimestamp) {
            showToast(gettextCatalog.getString('Selected range period not valid'));
          } else if ((endTimestamp - startTimestamp) < 300 || (endTimestamp - startTimestamp) > 3600) {
            // check that the selected range period is between five minutes and thirty days
            showToast(gettextCatalog.getString('Range period should be between five minutes and one hour'));
          } else {
            scope.start = startTimestamp;
            scope.end = endTimestamp;
            scope.date_range = true;
            scope.updatePage();
            $mdDialog.cancel();
          }
        }
      };

      $scope.close = function() {
        $mdDialog.cancel();
      };
    }

    scope.openMomentRange = function() {
      if ($routeParams.start && $routeParams.end) {
        scope.startFull = moment($routeParams.start * 1000).format('MM/DD/YYYY h:mm A');
        scope.endFull = moment($routeParams.end * 1000).format('MM/DD/YYYY h:mm A');
      }
      $mdDialog.show({
        templateUrl: 'components/locations/clients/_client_date_range.html',
        parent: angular.element(document.body),
        clickOutsideToClose:true,
        locals: {
          startFull: scope.startFull,
          endFull:   scope.endFull
        },
        controller: rangeCtrl
      });
    };

    scope.clearRangeFilter = function() {
      scope.start = undefined;
      scope.end = undefined;
      scope.date_range = false;
      scope.updatePage();
    };

    scope.clearQueryFilter = function() {
      scope.query.query = undefined;
      scope.updatePage();
    };

    var getLogs = function() {
      Logs.query({
        location_id: scope.location.id,
        ap_mac: ap_mac,
        // page: scope.query.page,
        per: scope.query.limit,
        start_time: start_time,
        end_time: end_time,
        q: scope.query.query
      }).$promise.then(function(res) {
        scope.logs = res.data;
        setApNames();
        // scope._links = res._links;
        scope.loading = undefined;
      }, function() {
        scope.loading = undefined;
      });
    };

    var init = function() {
      Location.get({id: $routeParams.id}, function(data) {
        scope.location = data;
        fetchBoxes();
        getLogs();
      }, function(err){
        console.log(err);
      });
    };

    init();
  };

  return {
    link: link,
    scope: {
      loading: '='
    },
    templateUrl: 'components/locations/logging/_index.html'
  };

}]);
