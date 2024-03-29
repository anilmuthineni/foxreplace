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
 * Portions created by the Initial Developer are Copyright (C) 2007-2015 the Initial Developer. All Rights Reserved.
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
   * Easy access to most used controls.
   */
  get _tree() { return document.getElementById("substitutionListTree"); },
  get _progressOverlay() { return document.getElementById("progressOverlay"); },
  get _addButton() { return document.getElementById("addButton"); },
  get _editButton() { return document.getElementById("editButton"); },
  get _deleteButton() { return document.getElementById("deleteButton"); },
  get _clearButton() { return document.getElementById("clearButton"); },
  get _moveUpButton() { return document.getElementById("moveUpButton"); },
  get _moveDownButton() { return document.getElementById("moveDownButton"); },
  get _importButton() { return document.getElementById("importButton"); },
  get _importFromUrlButton() { return document.getElementById("importFromUrlButton"); },
  get _exportButton() { return document.getElementById("exportButton"); },
  get _subscriptionStatusTextBox() { return document.getElementById("subscriptionStatusTextBox"); },
  get _tooltip() { return document.getElementById("tooltip"); },
  get _disclosureButton() { return document.documentElement.getButton("disclosure"); },

  /**
   * Initialization code.
   */
  onLoad: function() {
    this.prefs.optionsWindow = window;
    this.Observers.add("fxrSubscriptionStatusChanged", this.updateSubscriptionStatus, this);
    this.Observers.add(this.prefs.substitutionListChangedKey, this.loadSubstitutionList, this);
    this.loadSubstitutionList();
    this.setupTree();
    this.updateSubscriptionStatus();
  },

  /**
   * Finalization code.
   */
  onUnload: function() {
    this.Observers.remove("fxrSubscriptionStatusChanged", this.updateSubscriptionStatus, this);
    this.Observers.remove(this.prefs.substitutionListChangedKey, this.loadSubstitutionList, this);
    this.prefs.optionsWindow = null;
  },

  /**
   * Handler for dialog accept. Saves the substitution list if instantApply is false.
   */
  onAccept: function() {
    if (!this.prefs.instantApply) {
      this.prefs.substitutionList = this.substitutionList;
    }

    return true;
  },

  /**
   * Tree double click event handler.
   */
  onTreeDoubleClick: function(aEvent) {
    let index = this._tree.boxObject.getRowAt(aEvent.clientX, aEvent.clientY);
    if (index >= 0) this.editSubstitutionGroup(index);
    else this.addSubstitutionGroup();
  },

  /**
   * Creates the tree view.
   */
  setupTree: function() {
    this._tree.view = {
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
          foxreplaceOptions._handleListChange();
          this.treeBox.invalidate(aRow, aColumn);
        }
      },
      getCellProperties: function(aRow, aColumn) {
        if (aColumn.id == "urlColumn" && foxreplaceOptions.core.fxrIsExclusionUrl(this.getCellText(aRow, aColumn))) {
          return "exclusionUrl";
        }
        else {
          return "";
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
  
  /**
   * Handles a change in the substitution list. Saves the substitution list to preferences if instantApply is true.
   */
  _handleListChange: function() {
    if (this.prefs.instantApply) {
      this.prefs.substitutionList = this.substitutionList;
    }
  },

  /**
   * Current substitution list.
   */
  _substitutionList: [],
  
  /**
   * Returns current substitution list.
   */
  get substitutionList() {
    return this._substitutionList;
  },
  
  /**
   * Sets a new current substitution list and updates the tree.
   */
  set substitutionList(aNewList) {
    let oldList = this._substitutionList;
    this._substitutionList = aNewList;
    let treeBox = this._tree.boxObject;
    treeBox.rowCountChanged(0, -oldList.length);
    treeBox.rowCountChanged(0, aNewList.length);
    treeBox.invalidate();
    this._clearButton.disabled = this.substitutionList.length == 0;
  },

  /**
   * Called when the options window is loaded or the substitution list is changed externally. Loads the substitution list from preferences or from the parameter
   * and fills the tree.
   */
  loadSubstitutionList: function(aSubstitutionList) {
    if (aSubstitutionList) {
      if (this.substitutionList.toSource() != aSubstitutionList.toSource())
        this.substitutionList = aSubstitutionList;

      this._toggleProgressIndicator(false);
    }
    else {
      this._toggleProgressIndicator(true);
      this.prefs.substitutionList.then(function(aList) { foxreplaceOptions.loadSubstitutionList(aList); });
    }
  },

  /**
   * Adds a new substitution group.
   */
  addSubstitutionGroup: function() {
    let params = {};

    document.documentElement.openSubDialog("chrome://foxreplace/content/substitutiongroupeditor.xul", "chrome,titlebar,toolbar,centerscreen,modal,resizable",
                                           params);

    if (params.out) {
      this.substitutionList.push(params.out.group);
      this._handleListChange();
      let treeBox = this._tree.boxObject;
      treeBox.rowCountChanged(this.substitutionList.length - 1, 1);
      treeBox.ensureRowIsVisible(this.substitutionList.length - 1);
      this._tree.view.selection.select(this.substitutionList.length - 1);
      this._clearButton.disabled = this.substitutionList.length == 0;
    }
  },

  /**
   * Shows the dialog to edit the selected substitution group in the tree.
   */
  editSubstitutionGroup: function(aIndex) {
    let index = aIndex;

    if (index == undefined) {
      let selection = this._tree.view.selection;
      if (selection.count == 0) return;
      index = selection.currentIndex;
    }

    let group = this.substitutionList[index];
    let params = { "in": { group: group } };

    document.documentElement.openSubDialog("chrome://foxreplace/content/substitutiongroupeditor.xul", "chrome,titlebar,toolbar,centerscreen,modal,resizable",
                                           params);

    if (params.out) {
      this.substitutionList.splice(index, 1, params.out.group);
      this._handleListChange();
      let treeBox = this._tree.boxObject;
      treeBox.invalidateRow(index);
      treeBox.ensureRowIsVisible(index);
    }
  },

  /**
   * Removes the selected substitution group in the tree.
   */
  deleteSubstitutionGroup: function() {
    let selection = this._tree.view.selection;
    if (selection.count == 0) return;

    let index = selection.currentIndex;
    this.substitutionList.splice(index, 1);
    this._handleListChange();
    this._tree.boxObject.rowCountChanged(index, -1);

    if (index < this.substitutionList.length) selection.select(index);
    else if (index > 0) selection.select(index - 1);
    
    this._clearButton.disabled = this.substitutionList.length == 0;
  },

  /**
   * Deletes all substitution groups.
   */
  clearSubstitutionList: function() {
    let count = this.substitutionList.length;
    this.substitutionList = [];
    this._handleListChange();
  },

  /**
   * Moves up the selected substitution group.
   */
  moveUpSubstitutionGroup: function() {
    let selection = this._tree.view.selection;
    if (selection.count == 0) return;
    let index = selection.currentIndex;
    if (index == 0) return;
    let group = this.substitutionList[index];
    this.substitutionList.splice(index, 1);
    this.substitutionList.splice(index - 1, 0, group);
    this._handleListChange();
    let treeBox = this._tree.boxObject;
    treeBox.invalidateRange(index - 1, index);
    treeBox.ensureRowIsVisible(index - 1);
    selection.select(index - 1);
  },

  /**
   * Moves down the selected substitution group.
   */
  moveDownSubstitutionGroup: function() {
    let selection = this._tree.view.selection;
    if (selection.count == 0) return;
    let index = selection.currentIndex;
    if (index == this.substitutionList.length - 1) return;
    let group = this.substitutionList[index];
    this.substitutionList.splice(index, 1);
    this.substitutionList.splice(index + 1, 0, group);
    this._handleListChange();
    let treeBox = this._tree.boxObject;
    treeBox.invalidateRange(index, index + 1);
    treeBox.ensureRowIsVisible(index + 1);
    selection.select(index + 1);
  },

  /**
   * Imports the substitution list from a file.
   */
  importSubstitutionList: function() {
    let filePath = this._showFileDialog("import");

    if (filePath) {
      this._toggleProgressIndicator(true);
      let substitutionListPromise = this.io.readList(filePath);
      substitutionListPromise.then(function onFulfilled(aSubstitutionList) {
        if (aSubstitutionList) foxreplaceOptions._finishImportSubstitutionList(aSubstitutionList);

        foxreplaceOptions._toggleProgressIndicator(false);
      },
      function onRejected(aError) {
        foxreplaceOptions.prompts.alert(foxreplaceOptions.getLocalizedString("options.importError"), aError);
        foxreplaceOptions._toggleProgressIndicator(false);
      });
    }
  },

  /**
   * Imports the substitution list from a URL.
   */
  importSubstitutionListFromUrl: function() {
    let url = this._promptForImportUrl();

    if (url) {
      this._toggleProgressIndicator(true);
      let substitutionListPromise = this.io.readListFromUrl(url);
      substitutionListPromise.then(function onFulfilled(aSubstitutionList) {
        if (aSubstitutionList) foxreplaceOptions._finishImportSubstitutionList(aSubstitutionList);

        foxreplaceOptions._toggleProgressIndicator(false);
      },
      function onRejected(aError) {
        foxreplaceOptions.prompts.alert(foxreplaceOptions.getLocalizedString("options.importError"), aError);
        foxreplaceOptions._toggleProgressIndicator(false);
      });
    }
  },

  /**
   * Common part of the importing pipeline.
   */
  _finishImportSubstitutionList: function(aSubstitutionList) {
    let params = {};
    document.documentElement.openSubDialog("chrome://foxreplace/content/appendoverwrite.xul", "chrome,titlebar,toolbar,centerscreen,modal", params);

    if (params.out) {
      if (params.out.button == "overwrite") this.substitutionList = aSubstitutionList;
      else this.substitutionList = this.substitutionList.concat(aSubstitutionList);

      this._handleListChange();
    }
  },

  /**
   * Exports the substitution list to a file.
   */
  exportSubstitutionList: function() {
    let filePath = this._showFileDialog("export");

    if (filePath) {
      let writePromise = this.io.writeList(this.substitutionList, filePath);
      writePromise.catch(function onRejected(aError) {
        foxreplaceOptions.prompts.alert(foxreplaceOptions.getLocalizedString("options.exportError"), aError);
      });
    }
  },

  /**
   * Enables or disables some buttons when an substitution group item is selected or deselected.
   */
  onSelectSubstitutionGroup: function() {
    if (this._tree.currentIndex >= 0) {
      this._editButton.disabled = false;
      this._deleteButton.disabled = false;
      this._moveUpButton.disabled = false;
      this._moveDownButton.disabled = false;
    }
    else {
      this._editButton.disabled = true;
      this._deleteButton.disabled = true;
      this._moveUpButton.disabled = true;
      this._moveDownButton.disabled = true;
    }
  },

  /**
   * Updates the status of the subscription.
   */
  updateSubscriptionStatus: function() {
    this._subscriptionStatusTextBox.value = fxrSubscription.status;
  },

  /**
   * Shows the tooltip with additional information.
   */
  showTooltip: function() {
    this._tooltip.openPopup(this._disclosureButton);
  },

  /**
   * Shows the file dialog in the passed mode (import or export) and returns the file selected by the user.
   */
  _showFileDialog: function(aMode) {
    let title = this.getLocalizedString(aMode == "import" ? "importTitle" : "exportTitle");

    try {
      const Cc = Components.classes;
      const Ci = Components.interfaces;
      const nsIFP = Ci.nsIFilePicker;
      let fileDialog = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFP);
      let windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
      let window = windowMediator.getMostRecentWindow("");
      fileDialog.init(window, title, aMode == "import" ? nsIFP.modeOpen : nsIFP.modeSave);
      fileDialog.appendFilter(this.getLocalizedString("jsonFiles"), "*.json");
      fileDialog.appendFilters(nsIFP.filterAll);
      fileDialog.filterIndex = 0;
      fileDialog.defaultExtension = ".json";
      fileDialog.defaultString = "FoxReplace.json";

      let ret = fileDialog.show();

      if (ret == nsIFP.returnOK || ret == nsIFP.returnReplace) return fileDialog.file.path;
    }
    catch (e) {
      this.prompts.alert(title, e);
    }

    return null;
  },

  /**
   * Prompts the user for a URL and returns this URL or null if the user cancels or the URL is not a HTTP URL.
   */
  _promptForImportUrl: function() {
    let input = { value: "" };

    if (this.prompts.prompt(this.getLocalizedString("importFromUrlTitle"), this.getLocalizedString("importFromUrlText"), input)) {
      let url = input.value;
      if (/https?\:\/\//.test(url)) return url;
      else this.prompts.alert(this.getLocalizedString("nonSupportedProtocol"), this.getLocalizedString("onlyHttp"));
    }

    return null;
  },

  /**
   * Shows or hides the progress indicator according to aShow.
   */
  _toggleProgressIndicator: function(aShow) {
    this._progressOverlay.hidden = !aShow;
    this._addButton.disabled = aShow;
    this._editButton.disabled = aShow;
    this._deleteButton.disabled = aShow;
    this._clearButton.disabled = aShow;
    this._moveUpButton.disabled = aShow;
    this._moveDownButton.disabled = aShow;
    this._importButton.disabled = aShow;
    this._importFromUrlButton.disabled = aShow;
    this._exportButton.disabled = aShow;

    if (!aShow) this.onSelectSubstitutionGroup(); // little hack to get the proper state for the some buttons
  }

};

const Cu = Components.utils;

Cu.import("resource://foxreplace/core.js", foxreplaceOptions.core);
Cu.import("resource://foxreplace/io.js", foxreplaceOptions);
Cu.import("resource://foxreplace/Observers.js", foxreplaceOptions);
Cu.import("resource://foxreplace/prefs.js", foxreplaceOptions);
Cu.import("resource://foxreplace/services.js", foxreplaceOptions);
Cu.import("resource://foxreplace/subscription.js");

window.addEventListener("load", function() { foxreplaceOptions.onLoad(); }, false);
window.addEventListener("unload", function() { foxreplaceOptions.onUnload(); }, false);
