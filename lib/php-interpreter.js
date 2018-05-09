'use babel';

import PhpInterpreterView from './php-interpreter-view';
import { CompositeDisposable } from 'atom';

export default {

  phpInterpreterView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.phpInterpreterView = new PhpInterpreterView(state.phpInterpreterViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.phpInterpreterView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'php-interpreter:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.phpInterpreterView.destroy();
  },

  serialize() {
    return {
      phpInterpreterViewState: this.phpInterpreterView.serialize()
    };
  },

  toggle() {
    console.log('PhpInterpreter was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
