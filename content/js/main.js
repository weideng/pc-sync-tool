/* This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/. */


var FFOSAssistant = (function() {
  var connPool = null;

  var wsurl = "ws://" + location.host + "/ws";
  // var wsurl = "ws://localhost:8888/ws";

  function showConnectView() {
    $id('device-connected').classList.add('hiddenElement');
    $id('device-unconnected').classList.remove('hiddenElement');
    $id('views').classList.add('hidden-views');
    ViewManager.showContent('connect-view');
  }

  function showSummaryView() {
    $id('device-connected').classList.remove('hiddenElement');
    $id('device-unconnected').classList.add('hiddenElement');
    ViewManager.showContent('summary-view');
  }

  /**
   * Format storage size.
   */
  function formatStorage(sizeInBytes) {
    var sizeInMega = sizeInBytes / 1024 / 1024;

    if (sizeInMega > 900) {
      var sizeInGiga = sizeInMega / 1024;
      return (sizeInGiga.toFixed ? sizeInGiga.toFixed(2) : sizeInGiga) + 'G';
    }

    return (sizeInMega.toFixed ? sizeInMega.toFixed(2) : sizeInMega) + 'M';
  }

  function fillStorageSummaryInfo(elemId, info) {
    var elem = $id(elemId);
    var total = info.usedInBytes + info.freeInBytes;
    if(total > 0){
      var usedInP = Math.floor(info.usedInBytes / total * 100) + '%';
      $expr('.storage-number', elem)[0].textContent =
	formatStorage(info.usedInBytes) + '/' + formatStorage(total) + ' ' + usedInP;
      $expr('.storage-graph .used', elem)[0].style.width = usedInP;
      if(elemId =='sdcard-storage-summary' ){
	var subInP = Math.floor(info.picture / info.usedInBytes * 100);
	if(subInP == 0)
	  subInP = 1;
	$expr('.storage-used', elem)[0].style.width = subInP + '%';
	subInP = Math.floor(info.music / info.usedInBytes * 100);
	if(subInP == 0)
	  subInP = 1;
	$expr('.storage-used', elem)[1].style.width = subInP + '%';
	subInP = Math.floor(info.video / info.usedInBytes * 100);
	if(subInP == 0)
	  subInP = 1;
	$expr('.storage-used', elem)[2].style.width = subInP + '%';
	subInP = Math.floor((info.usedInBytes - info.music - info.picture - info.video) / info.usedInBytes * 100);
	if(subInP == 0)
	  subInP = 1;
	$expr('.storage-used', elem)[3].style.width =  subInP + '%';
      }
    }else{
      $expr('.storage-number', elem)[0].textContent =
	formatStorage(info.usedInBytes) + '/' + formatStorage(total);
    }
  }

  function getAndShowSummaryInfo() {
    CMD.Device.getDeviceInfo(function onresponse_getDeviceInfo(message) {
      var deviceInfo = {};
      var sdcardInfo = {
        usedInBytes: 0,
        freeInBytes: 0,
	picture: 0,
	music: 0,
	video:0
      };
      var dataJSON = JSON.parse(message.data);
      deviceInfo.usedInBytes = dataJSON[4].usedSpace;
      deviceInfo.freeInBytes = dataJSON[4].freeSpace;
      sdcardInfo.usedInBytes = dataJSON[3].usedSpace;
      sdcardInfo.freeInBytes = dataJSON[3].freeSpace;
      sdcardInfo.picture = dataJSON[0].usedSpace;
      sdcardInfo.music = dataJSON[1].usedSpace;
      sdcardInfo.video = dataJSON[2].usedSpace;


      fillStorageSummaryInfo('device-storage-summary', deviceInfo);
      fillStorageSummaryInfo('sdcard-storage-summary', sdcardInfo);
    }, function onerror_getDeviceInfo(message) {
      console.log('Error occurs when fetching device infos, see: ' + JSON.stringify(message));
    });
  }

  /**
   * Show the contact view, and start fetching the contacts data from device.
   */
  function showContactView() {
    // Switch view to manage view
    ViewManager.showContent('contact-view');
  }

  function getAndShowAllContacts(viewData) {
    CMD.Contacts.getAllContacts(function onresponse_getAllContacts(message) {
      // Make sure the 'select-all' box is not checked.
      ContactList.selectAllContacts(false);
      var dataJSON = JSON.parse(message.data);
      ContactList.init(dataJSON,viewData);
      //if (dataJSON.length > 0) {
      //  ContactList.showContactInfo(dataJSON[0]);
      //}
    }, function onerror_getAllContacts(message) {
      log('getAndShowAllContacts Error occurs when fetching all contacts.');
    });
  }

  function getAndShowAllSMSThreads() {
    updateSMSThreads();
    SmsList.startListening();
  }
  
  function updateSMSThreads() {
    CMD.SMS.getThreads(function onresponse_getThreads(messages) {
      // Make sure the 'select-all' box is not checked.  
      SmsList.selectAllSms(false); 
      var dataJSON = JSON.parse(messages.data);
      //console.log(messages.data);
      SmsList.init(dataJSON);
    }, function onerror_getThreads(messages) {
      log('Error occurs when fetching all messages' + messages.message);  
    });
  }

  function getAndShowAllMusics() {
    CMD.Musics.getAllMusicsInfo(function onresponse_getAllMusicsInfo(message) {
      // Make sure the 'select-all' box is not checked.
      MusicList.selectAllMusics(false);
      var dataJSON = JSON.parse(message.data);
      MusicList.init(dataJSON);
    }, function onerror_getAllMusicsInfo(message) {
      log('Error occurs when fetching all musics.');
    });
  }
  
  function connectToUSB(event) {
    var timeout = null;

    if (connPool) {
      connPool.finalize();
      connPool = null;
    }

    connPool = new TCPConnectionPool({
      size: 2,
      onenable: function onenable() {
        // FIXME 此时server端还未完成data监听事件注册，延迟显示
        timeout = window.setTimeout(showSummaryView, 1000);
      },
      ondisable: function ondisable() {
        log('USB Socket is closed');
        window.clearTimeout(timeout);
        showConnectView();
        socket = null;
        ViewManager.reset();
      } ,
      onMsmListening: function onMsmListening(message) {
        SmsList.onMessage(message);
      }
    });
  }

  function init() {
    /*
    $id('avatar-e').addEventListener('click', function (e) {
      $id('image').click();
    });

    $id('image').addEventListener('change', function() {
      var MAX_WIDTH = 320;
      var MAX_HEIGHT = 320;
      var pic = $id('avatar-e');

      var offscreenImage = new Image();
      var url = URL.createObjectURL($id('image').files[0]);
      offscreenImage.src = url;
      offscreenImage.onerror = function () {
        URL.revokeObjectURL(url);
        alert('error');
      };
      offscreenImage.onload = function () {
        URL.revokeObjectURL(url);

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = MAX_WIDTH;
        canvas.height = MAX_HEIGHT;
        var scalex = canvas.width / offscreenImage.width;
        var scaley = canvas.height / offscreenImage.height;

        var scale = Math.max(scalex, scaley);

        var w = Math.round(MAX_WIDTH / scale);
        var h = Math.round(MAX_HEIGHT / scale);
        var x = Math.round((offscreenImage.width - w) / 2);
        var y = Math.round((offscreenImage.height - h) / 2);

        context.drawImage(offscreenImage, x, y, w, h,
                      0, 0, MAX_WIDTH, MAX_HEIGHT);
        canvas.toBlob(function (blob) {
          var fr = new FileReader();
          fr.readAsDataURL(blob);
          fr.onload = function (e) {
            pic.src = e.target.result;
          };
        });
      };
    });
*/
    $id('lang-settings').addEventListener('click', function onclick_langsetting(event) {
      if (!event.target.classList.contains('language-code-button')) {
        return;
      }

      navigator.mozL10n.language.code = event.target.dataset.languageCode;
      $expr('.language-code-button', this).forEach(function(elem) {
        elem.classList.remove('current');
      });

      event.target.classList.add('current');
    });

    if (navigator.mozFFOSAssistant) {
      navigator.mozFFOSAssistant.onadbstatechange = function onADBStateChange(event) {
        if (navigator.mozFFOSAssistant.adbConnected === true) {
          connectToUSB();
        }
      };

      if (navigator.mozFFOSAssistant.adbConnected === true) {
        connectToUSB();
      }
    }

    // Register view event callbacks
    ViewManager.addViewEventListener('summary-view', 'firstshow', getAndShowSummaryInfo);
    ViewManager.addViewEventListener('contact-view', 'firstshow', getAndShowAllContacts);
    ViewManager.addViewEventListener('contact-view', 'othershow', getAndShowAllContacts);
    ViewManager.addViewEventListener('sms-view', 'firstshow', getAndShowAllSMSThreads);
    ViewManager.addViewEventListener('sms-view', 'othershow', updateSMSThreads);
    ViewManager.addViewEventListener('music-view', 'firstshow', getAndShowAllMusics);
  }

  function addDeviceManagerEventListeners() {
    document.addEventListener(DriverManager.EVENT_INSTALLING_DRIVER, function(event) {
      new ModalDialog({
        title: 'Installing driver',
        titleL10n: 'installing-driver-title',
        bodyText: 'We are installing driver for you.',
        bodyTextL10n: 'installing-driver-body',
        cancelable: false
      });
    });

    document.addEventListener(DriverManager.EVENT_DRIVER_FAIL_INSTALLED, function(event) {
      new ModalDialog({
        title: 'Failed To Install Driver',
        titleL10n: 'failed-install-driver-title',
        bodyText: 'We encountered an error when installing driver: ' + event.data.errorMessage,
        bodyTextL10n: 'failed-install-driver-body'
      });
    });

    document.addEventListener(DriverManager.EVENT_DEVICE_READY, function(event) {
      // Just make sure the modal dialog is closed.
      ModalDialog.closeAll();
    });

    document.addEventListener(DriverManager.EVENT_NO_DEVICE_FOUND, function(event) {
      // Just make sure the modal dialog is closed.
      ModalDialog.closeAll();
    });

    document.addEventListener(DriverManager.EVENT_DEVICE_CHANGED, function(event) {
      new ModalDialog({
        title: 'Device Changed',
        titleL10n: 'device-changed-title',
        bodyText: 'We detected that device is changed.',
        bodyTextL10n: 'device-changed-body'
      });
    });

    document.addEventListener(DriverManager.EVENT_DEVICE_FOUND, function(event) {
      new ModalDialog({
        title: 'Device Found',
        titleL10n: 'device-found-title',
        bodyText: 'We detected a FFOS device',
        bodyTextL10n: 'device-found-body'
      });
    });
  }

  window.addEventListener('load', function window_onload(event) {
    window.removeEventListener('load', window_onload);
    init();

    if (os.isWindows) {
      addDeviceManagerEventListeners();
    }
  });

  window.addEventListener('localized', function showBody() {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
    document.body.hidden = false;

    $expr('#lang-settings .language-code-button').forEach(function(label) {
      if (label.dataset.languageCode == navigator.mozL10n.language.code) {
        label.classList.add('current');
      } else {
        label.classList.remove('current');
      }
    });
  });

  return {
    sendRequest: function(obj) {
      if (connPool) {
        connPool.send(obj);
      }
    },

    getAndShowAllContacts: getAndShowAllContacts,
    getAndShowAllSMSThreads: getAndShowAllSMSThreads,
    getAndShowAllMusics : getAndShowAllMusics,
    updateSMSThreads: updateSMSThreads
  };
})();

