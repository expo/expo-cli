let events = require('events');
let crayon = require('@ccheever/crayon');

class AppEmitter extends events.EventEmitter {

  setPackagerController(packagerController) {

    this._packagerController = packagerController;

    this._packagerController.on('stdout', (data) => {
      this.emit('log-out', data);
    });

    this._packagerController.on('stderr', (data) => {
      this.emit('log-err', data);
    });

    this.emit('setPackagerController');
  }


}

module.exports = new AppEmitter()
