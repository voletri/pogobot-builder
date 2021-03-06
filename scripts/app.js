// Polyfill
// Array.prototype.filter
[].filter||(Array.prototype.filter=function(a,b,c,d,e){c=this;d=[];for(e in c)~~e+''==e&&e>=0&&a.call(b,c[e],+e,c)&&d.push(c[e]);return d});

var availableVersions = [
  '0.6.0'
];

var botVersion;
var queryParamVersion = getParameterByName('v');
if(availableVersions.indexOf(queryParamVersion) > -1){
  botVersion = queryParamVersion;
} else {
  botVersion = availableVersions[availableVersions.length - 1];
}

var app = angular.module("configBuilder", [ 'ngMap', 'ngTagsInput' ]);

app.controller("formController", function($scope, $http) {
  $http.get('data/v' + botVersion + '/structure.json')
    .then(function(response){
      $scope.structure = response.data;
    });
});

app.controller("mapController", function($scope, $element, NgMap){
  NgMap.getMap().then(function(map){
    google.maps.event.addListener(map.markers[0], 'dragend', function(data){
      var lat = data.latLng.lat();
      var lng = data.latLng.lng();

      $($element[0]).children('input[type=hidden]:nth-child(1)').val(lat);
      $($element[0]).children('input[type=hidden]:nth-child(2)').val(lng);
    });
  });
});

app.controller("listController", function($scope, $http, $element){
  var tags = [];
  $scope.tags = [];

  $scope.setDefaultValues = function(values){
    for(var i = 0; i < values.length; i++){
      $scope.tags.push({
        text: values[i]
      });
      tags.push(values[i]);
    }
    updateHiddenInput();
  };

  $scope.addTag = function(tag){
    tags.push(tag.text);
    updateHiddenInput();
  };

  $scope.removeTag = function(tag){
    var index = tags.indexOf(tag.text);
    if (index > -1) {
      tags.splice(index, 1);
    }
    updateHiddenInput();
  };

  function updateHiddenInput(){
    $($element[0]).find('input[type=hidden]').val(tags.join(','));
  }

  $scope.loadAutoComplete = function(query, url){
    return $http.get(url)
      .then(function(response){
        query = query.toLowerCase();
        var data = response.data;
        return data.filter(function(x){
          return x.toLowerCase().indexOf(query) >= 0;
        }).sort(function(a, b){
          return a.length - b.length;
        })
    });
  };
});

app.controller("buttonConfigController", function($scope){
  $scope.click = function(){
    getGeneratedConfigFile(function(err, data){
      download('config.properties', new Blob([data], {
        type: 'text/plain'
      }));
    });
  };
});

app.controller("buttonPackageController", function($scope){
  $scope.click = function(){
    getGeneratedConfigFile(function(err, config){
      getBotJar(function(err, jar){
        var name = 'PokemonGoBot-v' + botVersion;

        var zip = new JSZip();
        var folder = zip.folder(name);
        folder.file('config.properties', config);
        folder.file('bot.jar', jar, {
          type: 'binary'
        });
        folder.file('start.bat', 'java -jar bot.jar\n');
        zip.generateAsync({ type: 'blob' })
          .then(function(blob) {
            download(name + '.zip', blob);
          });
      });
    });
  };
});

function getGeneratedConfigFile(callback){
  var serialized = $('form').serializeArray();
  $.get('data/v' + botVersion + '/config.properties.template', function(data){
    for(var i = 0; i < serialized.length; i++){
      var serializedPair = serialized[i];
      data = data.replace(new RegExp(serializedPair.name + '=.*'), serializedPair.name + '=' + serializedPair.value);
    }
    callback(null, data);
  });
}

function getBotJar(callback){
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'data/v' + botVersion + '/bot.jar', true);
  xhr.responseType = 'arraybuffer';

  xhr.onload = function(e) {
    if (xhr.status == 200) {
      callback(null, new Uint8Array(xhr.response));
    }
  };

  xhr.send();
}

function download(filename, blob) {
  var element = document.createElement('a');
  element.setAttribute('href', URL.createObjectURL(blob));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}