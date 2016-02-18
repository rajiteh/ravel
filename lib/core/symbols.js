'use strict';

module.exports = class {
  // structures
  static get params() { return Symbol.for('_params'); }
  static get knownParameters() { return Symbol.for('_knownParamters'); }
  static get modules() { return Symbol.for('_modules'); }
  static get moduleFactories() { return Symbol.for('_moduleFactories'); }
  static get resourceFactories() { return Symbol.for('_resourceFactories'); }
  static get routesFactories() { return Symbol.for('_routesFactories'); }

  // methods
  static get loadParameters() { return Symbol.for('_loadParameters()'); }
  static get moduleInit() { return  Symbol.for('_moduleInit'); }
  static get resourceInit() { return  Symbol.for('_resourceInit'); }
  static get routesInit() { return  Symbol.for('_routesInit'); }

  // objects
  static get injector() { return Symbol.for('Injector'); }
};