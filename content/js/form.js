/* This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function ContactField(options) {
  this.initialize(options);
}

ContactField.prototype = {
  initialize: function(options) {
    // FIXME l10n
    this.options = extend({
      id: null,
      typeList: [],
      fields: [],
      initValues: [],
      container: document.body,
      addButtonLabel: 'add'
    }, options);

    if (!this.options.initValues) {
      this.options.initValues = []
    }

    if (!this.options.id || this.options.fields.length == 0) {
      throw "Options is not valid.";
    }
  },

  _getElemId: function cf_getElemId() {
    return 'field-' + this.options.id;
  },

  _getAddNewButton: function cf_getAddNewButton() {
    return $expr('button.add-new-button', this.elem)[0];
  },

  render: function cf_render() {
    if ($id(this._getElemId())) {
      throw "Field " + this.options.id + " is duplicated.";
    }

    // FIXME escape
    this.elem = document.createElement('li');
    this.elem.id = this._getElemId();
    this.elem.innerHTML = '<button class="add-new-button" data-l10n-id="' + this.options.addButtonLabel + '">' + _(this.options.addButtonLabel) + '</button>';

    // Create input fields and fill it with init values.
    var self = this;
    if (this.options.initValues.length == 0) {
      if (this.options.fieldType == 'string') {
        this.options.initValues.push('');
      } else {
        this.options.initValues.push({});
      }
    }

    this.options.initValues.forEach(function(initValue) {
      self.addNewField(initValue);
    });

    this.options.container.appendChild(this.elem);

    // Register click event handler to add new button
    var self = this;
    this._getAddNewButton().addEventListener('click', function onclick_addNewButton(event) {
      if (self.options.fieldType == 'string') {
        self.addNewField([]);
      } else {
        self.addNewField({});
      }
    });

    return this;
  },

  addNewField: function cf_addNewField(initValue) {
    var section = document.createElement('section');
    var self = this;

    // Fetch attribute, and return empty str if it's undefined.


    function _f(obj, key) {
      if (!obj) return '';
      return obj[key] ? obj[key] : '';
    }

    var html = '';
    html += '  <div>';
    html += '    <fieldset class="form-row">';

    // Show legend only when typeList is defined.
    if (this.options.typeList && this.options.typeList.length > 0) {
      html += '      <legend class="action">';
      html += '        <select name="type">';
      this.options.typeList.forEach(function(type) {
        var selected = (initValue && initValue.type && type.toLowerCase() === initValue.type[0].toLowerCase()) ? true : false;
        html += '        <option value="' + type + '" data-l10n-id="' + type + '"' + (selected ? ' selected' : '') + '>';
        html += _(type);
        html += '        </option>';
      });
      html += '        </select>';
      html += '      </legend>';
    }

    html += '      <section>';
    this.options.fields.forEach(function(f) {
      html += '      <p>';
      if (self.options.fieldType == 'string') {
        html += '      <input data-l10n-id="' + f.l10nId + '" type="' + f.type + '" value="' + initValue + '"></input>';
      } else {
        html += '      <input data-name="' + f.name + '" type="' + f.type + '" data-l10n-id="' + f.l10nId + '" value="' + _f(initValue, f.name) + '"></input>';
      }
      html += '      </p>';
    });

    html += '      <section>';
    html += '    </fieldset>';
    html += '    <div class="action-delete"></div>';
    html += '  </div>';

    section.innerHTML = html;

    this.elem.insertBefore(section, this._getAddNewButton());

    // Translate the fields
    navigator.mozL10n.translate(section);

    // Remove self when clicking on the delete button.
    section.addEventListener('click', function onclick_deleteButton(event) {
      var elem = event.target;
      if (elem instanceof HTMLDivElement && elem.className == 'action-delete') {
        this.parentNode.removeChild(this);
      }
    });
  },

  getValues: function cf_getValues() {
    var values = [];
    var formRows = $expr('fieldset.form-row', this.elem);
    var self = this;

    if (this.options.fieldType == 'string') {
      formRows.forEach(function(row) {
        var value = $expr('input', row)[0].value.trim();
        if (value) {
          values.push(value);
        }
      });
    } else {
      formRows.forEach(function(row) {
        var value = {
          type: $expr('select', row)[0].value,
        };

        var hasValue = false;

        $expr('input', row).forEach(function(input) {
          value[input.dataset.name] = input.value.trim();
          if (!hasValue && input.value.trim() != '') {
            hasValue = true;
          }
        });

        if (hasValue) {
          values.push(value);
        }
      });
    }

    return values;
  }
};

var ContactForm = (function() {
  // Hold all the contact field that we add.
  var fields = {};

  /**
   * Edit the given contact in the form.
   * If the given contact is null, then adding contact is performed.
   */

  function editContact(contact) {
    ViewManager.showViews('contact-edit-view');

    // Mark form as adding new contact
    $id('contact-edit-view').dataset.addContact = !contact;

    var container = $expr('#contact-form ul')[0];
    container.innerHTML = '';
    fields = [];

    $id('contact-form-id').value = contact ? contact.id : '';
    if (contact) {
      if ($id('contact-' + contact.id).dataset.avatar) {
        $id('avatar-add-edit').src = $id('contact-' + contact.id).dataset.avatar;
        $id('avatar-add-edit').classList.remove('avatar-add-edit-default');
      } else {
        $id('avatar-add-edit').src = '';
        $id('avatar-add-edit').classList.add('avatar-add-edit-default');
      }
    } else {
      $id('avatar-add-edit').src = '';
      $id('avatar-add-edit').classList.add('avatar-add-edit-default');
    }
    $id('givenName').value = contact && contact.givenName ? contact.givenName.join(' ') : '';
    $id('familyName').value = contact && contact.familyName ? contact.familyName.join(' ') : '';
    $id('org').value = contact && contact.org ? contact.org.join(' ') : '';
    $id('givenName').focus();

    fields['tel'] = new ContactField({
      id: 'tel',
      typeList: ['Mobile', 'Home', 'Work', 'Personal', 'FaxHome', 'FaxOffice', 'FaxOther', 'Other'],
      fields: [{
        name: 'value',
        l10nId: 'phone',
        type: 'tel'
      }, {
        name: 'carrier',
        l10nId: 'carrier-name',
        type: 'text'
      }],
      initValues: contact && contact.tel ? contact.tel : [],
      container: container,
      addButtonLabel: 'add-new-phone'
    }).render();

    fields['adr'] = new ContactField({
      id: 'address',
      typeList: ['Home', 'Work'],
      fields: [{
        name: 'streetAddress',
        l10nId: 'street',
        type: 'text'
      }, {
        name: 'postalCode',
        l10nId: 'zipcode',
        type: 'number'
      }, {
        name: 'locality',
        l10nId: 'city',
        type: 'text'
      }, {
        name: 'countryName',
        l10nId: 'country',
        type: 'text'
      }],
      initValues: contact && contact.adr ? contact.adr : [],
      container: container,
      addButtonLabel: 'add-new-address'
    }).render();

    fields['email'] = new ContactField({
      id: 'email',
      typeList: ['Personal', 'Work', 'Home'],
      fields: [{
        name: 'value',
        l10nId: 'email',
        type: 'email'
      }],
      initValues: contact && contact.email ? contact.email : [],
      container: container,
      addButtonLabel: 'add-new-email'
    }).render();

    fields['note'] = new ContactField({
      id: 'note',
      // Default is ContactField
      fieldType: 'string',
      fields: [{
        l10nId: 'comment',
        type: 'text'
      }],
      initValues: contact && contact.note ? contact.note : [],
      container: container,
      addButtonLabel: 'add-new-comment'
    }).render();
  }

  function getFieldValue(id) {
    if (fields[id]) {
      return fields[id].getValues();
    } else if ($id(id) && $id(id).value.trim()) {
      return [$id(id).value];
    }

    return [];
  }

  function saveContact() {
    var contactId = $id('contact-form-id').value;
    var updateContact = !! contactId;
    var contact = null;

    if (updateContact) {
      // Update contact
      contact = ContactList.getContact(contactId);
    } else {
      // create a new one
      contact = {
        id: null,
        photo: [],
        name: [],
        honorificPrefix: [],
        givenName: [],
        familyName: [],
        additionalName: [],
        honorificSuffix: [],
        nickname: [],
        email: [],
        url: [],
        category: [],
        adr: [],
        tel: [],
        org: [],
        jobTitle: [],
        bday: null,
        note: [],
        impp: [],
        anniversary: null,
        sex: 'male',
        genderIdentity: null
      };
    }

    // Read modified fields
    contact.familyName = getFieldValue('familyName');
    contact.givenName = getFieldValue('givenName');
    // Concat given name with family name as the name
    contact.name = getFieldValue('givenName').concat(getFieldValue('familyName'));
    contact.tel = getFieldValue('tel');
    contact.adr = getFieldValue('adr');
    contact.email = getFieldValue('email');
    contact.org = getFieldValue('org');
    contact.note = getFieldValue('note');

    if ($id('avatar-add-edit').classList.contains('avatar-add-edit-default')) {
      contact.photo = [];
    } else {
      contact.photo = [$id('avatar-add-edit').src];
    }

    if (contact.givenName.length == 0) {
      alert(navigator.mozL10n.get('EmptyForm'));
      return;
    }

    if (updateContact) {
      // Save to device
      CMD.Contacts.updateContact(JSON.stringify(contact), function onresponse_updatecontact(message) {
        var contactsUpdated = [];
        if (!message.result) {
          contactsUpdated.push(JSON.parse(message.data));
        }
        ContactList.updateContacts(contactsUpdated);
        ContactList.showContactInfo(contact);
      }, function onerror_updatecontact(message) {
        alert('Error occurs when updating contacts: ' + JSON.stringify(message));
      });
    } else {
      // Create new contact
      CMD.Contacts.addContact(JSON.stringify(contact), function onresponse_addcontact(message) {
        var contactsAdded = [];
        if (!message.result) {
          contactsAdded.push(JSON.parse(message.data));
        }
        ContactList.addContacts(contactsAdded);
      }, function onerror_addcontact(message) {
        alert('Error occurs when adding contacts: ' + JSON.stringify(message));
      });
    }
  }

  function quickSaveContact() {
    var fullName = $id('fullName').value.trim();
    var mobile = $id('mobile').value.trim();
    if (fullName == '') {
      alert('Please input full name');
    }
    if (mobile == '') {
      alert('Please input cell phone number');
    }
    contact = {
      id: null,
      photo: [],
      name: [],
      honorificPrefix: [],
      givenName: [],
      familyName: [],
      additionalName: [],
      honorificSuffix: [],
      nickname: [],
      email: [],
      url: [],
      category: [],
      adr: [],
      tel: [],
      org: [],
      jobTitle: [],
      bday: null,
      note: [],
      impp: [],
      anniversary: null,
      sex: 'male',
      genderIdentity: null
    };
    var index = fullName.lastIndexOf(' ');
    if (index != -1) {
      contact.familyName = [fullName.substr(index + 1, fullName.length)];
      contact.givenName = [fullName.substr(0, index)];
      contact.name = contact.givenName.concat(contact.familyName);
    } else {
      contact.familyName = [];
      contact.givenName = [fullName];
      contact.name = contact.givenName;
    }
    contact.tel = [{
      "type": "Mobile",
      "value": mobile,
      "carrier": ""
    }];
    CMD.Contacts.addContact(JSON.stringify(contact), function onresponse_addcontact(message) {
      var contactsAdded = [];
      if (!message.result) {
        contactsAdded.push(JSON.parse(message.data));
      }
      ContactList.addContacts(contactsAdded);
    }, function onerror_addcontact(message) {
      alert('Error occurs when quick adding contact: ' + JSON.stringify(message));
    });
  }

  window.addEventListener('load', function onload(event) {
    window.removeEventListener('load', onload);
    $id('save-contact').addEventListener('click', function onclick_saveContact(evt) {
      saveContact();
      ViewManager.showViews('show-contact-view');
    });
    $id('cancel-edit-contact').addEventListener('click', function onclick_cancel(evt) {
      ViewManager.showViews('show-contact-view');
    });
    $id('quick-save-contact').addEventListener('click', function onclick_quickSaveContact(evt) {
      quickSaveContact();
    });
    $id('avatar-add-edit').addEventListener('click', function(e) {
      $id('avatar-input').click();
    });
    $id('avatar-input').addEventListener('change', function() {
      var MAX_WIDTH = 320;
      var MAX_HEIGHT = 320;
      var pic = $id('avatar-add-edit');

      var offscreenImage = new Image();
      var url = URL.createObjectURL(this.files[0]);
      offscreenImage.src = url;
      offscreenImage.onerror = function() {
        URL.revokeObjectURL(url);
        alert('error');
      };
      offscreenImage.onload = function() {
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

        context.drawImage(offscreenImage, x, y, w, h, 0, 0, MAX_WIDTH, MAX_HEIGHT);
        canvas.toBlob(function(blob) {
          var fr = new FileReader();
          fr.readAsDataURL(blob);
          fr.onload = function(e) {
            pic.src = e.target.result;
            pic.classList.remove('avatar-add-edit-default');
          };
        });
      };
    });
  });

  return {
    // If contact object is not given, perform adding a new contact
    editContact: editContact,
    saveContact: saveContact
  };
})();