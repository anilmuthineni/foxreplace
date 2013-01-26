/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version 1.1 (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
 * specific language governing rights and limitations under the License.
 *
 * The Original Code is FoxReplace.
 *
 * The Initial Developer of the Original Code is Marc Ruiz Altisent.
 * Portions created by the Initial Developer are Copyright (C) 2007-2013 the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of either the GNU General Public License Version 2 or later (the "GPL"), or the GNU
 * Lesser General Public License Version 2.1 or later (the "LGPL"), in which case the provisions of the GPL or the LGPL are applicable instead of those above.
 * If you wish to allow use of your version of this file only under the terms of either the GPL or the LGPL, and not to allow others to use your version of this
 * file under the terms of the MPL, indicate your decision by deleting the provisions above and replace them with the notice and other provisions required by
 * the GPL or the LGPL. If you do not delete the provisions above, a recipient may use your version of this file under the terms of any one of the MPL, the GPL
 * or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Object to manage FoxReplace options.
 */
let foxreplaceOptions = {

  core: {},

  /**
   * Initialization code.
   */
  onLoad: function() {
    this.Observers.add("fxrSubscriptionStatusChanged", this.updateSubscriptionStatus, this);
    this.prefs.observe("substitutionListJSON", this.loadSubstitutionList, this);
    this.loadSubstitutionList();
    this.setupTree();
    this.updateSubscriptionStatus();
  },

  /**
   * Finalization code.
   */
  onUnload: function() {
    this.Observers.remove("fxrSubscriptionStatusChanged", this.updateSubscriptionStatus, this);
    this.prefs.ignore("substitutionListJSON", this.loadSubstitutionList, this);
  },

  /**
   * Tree double click event handler.
   */
  onTreeDoubleClick: function(aEvent) {
    let index = document.getElementById("substitutionListTree").boxObject.getRowAt(aEvent.clientX, aEvent.clientY);
    if (index >= 0) this.editSubstitutionGroup(index);
    else this.addSubstitutionGroup();
  },

  /**
   * Creates the tree view.
   */
  setupTree: function() {
    document.getElementById("substitutionListTree").view = {
      setTree: function(aTreeBox) {
        this.treeBox = aTreeBox;
      },
      isSorted: function() {
        return false;
      },
      get rowCount() {
        return foxreplaceOptions.substitutionList.length;
      },
      cycleHeader: function() {
      },
      getColumnProperties: function() {
      },
      getLevel: function() {
        return 0;
      },
      getRowProperties: function() {
      },
      isContainer: function() {
        return false;
      },
      isSeparator: function() {
        return false;
      },
      getCellText: function(aRow, aColumn) {
        let group = foxreplaceOptions.substitutionList[aRow];
        switch (aColumn.id) {
          case "nameColumn": return group.nonEmptyName;
          case "urlColumn": return group.urls.length > 0 ? group.urls[0] : "";
          case "inputColumn": return group.substitutions.length > 0 ? group.substitutions[0].input : "";
          case "outputColumn": return group.substitutions.length > 0 ? group.substitutions[0].output : "";
          default: return aColumn.id;
        }
      },
      getCellValue: function(aRow, aColumn) {
        if (aColumn.id == "enabledColumn") {
          let group = foxreplaceOptions.substitutionList[aRow];
          return group.enabled;
        }
        else return "";
      },
      setCellValue: function(aRow, aColumn, aValue) {
        if (aColumn.id == "enabledColumn") {
          let group = foxreplaceOptions.substitutionList[aRow];
          group.enabled = aValue == "true";
          foxreplaceOptions.saveSubstitutionList();
        }
      },
      getCellProperties: function(aRow, aColumn, aProperties) {
        if (aColumn.id == "urlColumn" && foxreplaceOptions.core.fxrIsExclusionUrl(this.getCellText(aRow, aColumn))) {
          let atomService = Cc["@mozilla.org/atom-service;1"].getService(Ci.nsIAtomService);
          aProperties.AppendElement(atomService.getAtom("exclusionUrl"));
        }
      },
      getImageSrc: function() {
        return null;
      },
      isEditable: function(aRow, aColumn) {
        return aColumn.id == "enabledColumn";
      }
    };
  },

  _substitutionListLength: 0,

  /**
   * Called when the options window is loaded or the substitution list is changed externally. Loads the substitution list from preferences and fills the tree.
   */
  loadSubstitutionList: function() {
    this.substitutionList = this.prefs.substitutionList.concat(); // easy way to create a copy of the array
    this.substitutionList.length;

    let treeBox = document.getElementById("substitutionListTree").boxObject;
    treeBox.rowCountChanged(0, -this._substitutionListLength);
    treeBox.rowCountChanged(0, this.substitutionList.length);
    treeBox.invalidate();
    this._substitutionListLength = this.substitutionList.length;

    if (this.substitutionList.length > 0) document.getElementById("clearButton").disabled = false;
    else document.getElementById("clearButton").disabled = true;
  },

  /**
   * Called when the substitution list is changed from the UI. Saves the substitution list to preferences.
   */
  saveSubstitutionList: function() {
    this.prefs.substitutionList = this.substitutionList;
  },

  /**
   * Adds a new substitution group.
   */
  addSubstitutionGroup: function() {
    let params = {};

    window.openDialog("chrome://foxreplace/content/substitutiongroupeditor.xul", "", "chrome,titlebar,toolbar,centerscreen,modal", params);

    if (params.out) {
      this.substitutionList.push(params.out.group);
      this.saveSubstitutionList();
      document.getElementById("substitutionListTree").view.selection.select(this.substitutionList.length - 1);
    }
  },

  /**
   * Shows the dialog to edit the selected substitution group in the tree.
   */
  editSubstitutionGroup: function(aIndex) {
    let index = aIndex;

    if (index == undefined) {
      let selection = document.getElementById("substitutionListTree").view.selection;
      if (selection.count == 0) return;
      index = selection.currentIndex;
    }

    let group = this.substitutionList[index];
    let params = { "in": { group: group } };

    window.openDialog("chrome://foxreplace/content/substitutiongroupeditor.xul", "", "chrome,titlebar,toolbar,centerscreen,modal", params);

    if (params.out) {
      this.substitutionList.splice(index, 1, params.out.group);
      this.saveSubstitutionList();
      document.getElementById("substitutionListTree").view.selection.select(index);
    }
  },

  /**
   * Removes the selected substitution group in the tree.
   */
  deleteSubstitutionGroup: function() {
    let selection = document.getElementById("substitutionListTree").view.selection;
    if (selection.count == 0) return;

    let index = selection.currentIndex;
    this.substitutionList.splice(index, 1);
    this.saveSubstitutionList();

    if (index < this.substitutionList.length) selection.select(index);
    else if (index > 0) selection.select(index - 1);
  },

  /**
   * Deletes all substitution groups.
   */
  clearSubstitutionList: function() {
    let count = this.substitutionList.length;
    this.substitutionList = [];
    this.saveSubstitutionList();
  },

  /**
   * Moves up the selected substitution group.
   */
  moveUpSubstitutionGroup: function() {
    let selection = document.getElementById("substitutionListTree").view.selection;
    if (selection.count == 0) return;
    let index = selection.currentIndex;
    if (index == 0) return;
    let group = this.substitutionList[index];
    this.substitutionList.splice(index, 1);
    this.substitutionList.splice(index - 1, 0, group);
    this.saveSubstitutionList();
    selection.select(index - 1);
  },

  /**
   * Moves down the selected substitution group.
   */
  moveDownSubstitutionGroup: function() {
    let selection = document.getElementById("substitutionListTree").view.selection;
    if (selection.count == 0) return;
    let index = selection.currentIndex;
    if (index == this.substitutionList.length - 1) return;
    let group = this.substitutionList[index];
    this.substitutionList.splice(index, 1);
    this.substitutionList.splice(index + 1, 0, group);
    this.saveSubstitutionList();
    selection.select(index + 1);
  },

  /**
   * Imports the substitution list from a file.
   */
  importSubstitutionList: function() {
    let substitutionList = fxrIO.importSubstitutionList();
    if (substitutionList) this.finishImportSubstitutionList(substitutionList);
  },

  /**
   * Imports the substitution list from an URL.
   */
  importSubstitutionListFromUrl: function() {
    let substitutionList = fxrIO.importSubstitutionListFromUrl();
    if (substitutionList) this.finishImportSubstitutionList(substitutionList);
  },

  /**
   * Common part of the importing pipeline.
   */
  finishImportSubstitutionList: function(aSubstitutionList) {
    let params = {};
    window.openDialog("chrome://foxreplace/content/appendoverwrite.xul", "", "chrome,titlebar,toolbar,centerscreen,modal", params);

    if (params.out) {
      if (params.out.button == "overwrite") this.substitutionList = aSubstitutionList;
      else this.substitutionList = this.substitutionList.concat(aSubstitutionList);

      this.saveSubstitutionList();
    }
  },

  /**
   * Exports the substitution list to a file.
   */
  exportSubstitutionList: function() {
    fxrIO.exportSubstitutionList(this.substitutionList);
  },

  /**
   * Enables or disables some buttons when an substitution group item is selected or deselected.
   */
  onSelectSubstitutionGroup: function() {
    if (document.getElementById("substitutionListTree").currentIndex >= 0) {
      document.getElementById("editButton").disabled = false;
      document.getElementById("deleteButton").disabled = false;
      document.getElementById("moveUpButton").disabled = false;
      document.getElementById("moveDownButton").disabled = false;
    }
    else {
      document.getElementById("editButton").disabled = true;
      document.getElementById("deleteButton").disabled = true;
      document.getElementById("moveUpButton").disabled = true;
      document.getElementById("moveDownButton").disabled = true;
    }
  },

  /**
   * Updates the status of the subscription.
   */
  updateSubscriptionStatus: function() {
    document.getElementById("subscriptionStatusTextBox").value = fxrSubscription.status;
  }

};

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://foxreplace/core.js", foxreplaceOptions.core);
Cu.import("resource://foxreplace/io.js");
Cu.import("resource://foxreplace/Observers.js", foxreplaceOptions);
Cu.import("resource://foxreplace/prefs.js", foxreplaceOptions);
Cu.import("resource://foxreplace/services.js", foxreplaceOptions);
Cu.import("resource://foxreplace/subscription.js");

window.addEventListener("load", function() { foxreplaceOptions.onLoad(); }, false);
window.addEventListener("unload", function() { foxreplaceOptions.onUnload(); }, false);
