class Logger {
  constructor(options) {
    this.debugEnabled = options.debugEnabled || false;
  }

  log(message) {
    console.log(message);
  }

  error(message, error) {
    console.error(message, error);
  }

  debug(message) {
    if (this.debugEnabled) {
      console.log(message);
    }
  }
}

export default Logger;
