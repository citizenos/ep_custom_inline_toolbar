'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const settings = require('ep_etherpad-lite/node/utils/Settings');
const _ = require('ep_etherpad-lite/static/js/underscore');

let inlineMenuItems;
let inlineButtons = [];

let createInlineToolbar = function () {
  const toolbar = this.toolbar;
  if (toolbar) {
    const availableButtons = toolbar.availableButtons;
    inlineButtons = [];
    inlineMenuItems.forEach((inlineBlock) => {
      if (Array.isArray(inlineBlock)) {
        const buttons = [];
        inlineBlock.forEach((buttonName) => {
          let buttonType = null;
          let buttonTitle = null;
          let localizationId = null;
          if (_.isObject(buttonName)) {
            const objKey = Object.keys(buttonName)[0];
            const keySettings = buttonName[objKey];
            buttonType = keySettings.buttonType;
            buttonTitle = keySettings.title;
            localizationId = keySettings.localizationId;
            buttonName = objKey;
          }

          if (availableButtons[buttonName]) {
            let buttonItem = availableButtons[buttonName];
            if (availableButtons[buttonName].attributes) {
              buttonItem = availableButtons[buttonName].attributes;
            }

            if (localizationId) {
              buttonItem.localizationId = localizationId;
              buttonTitle = localizationId;
            }
            buttonItem = toolbar.button(buttonItem);

            let buttonHtml = buttonItem.render();

            if (buttonType === 'link') {
              buttonHtml = buttonHtml
                  .replace('<button', '<span')
                  .replace('</button>', '</span>')
                  .replace('data-type="button"', 'data-type="link"');
            }

            if (buttonTitle) {
              buttonHtml = buttonHtml.replace('</span>', `${buttonTitle}</span>`);
            }

            buttons.push(buttonHtml);
          }
        });

        inlineButtons.push(buttons);
      }
    });
  }
};

exports.loadSettings = (hookName, context, cb) => {
  inlineMenuItems = context.settings.toolbar.custom_inline;
  return cb();
};

exports.clientVars = async (hook, context) => {
  // tell the client which year we are in
  await createInlineToolbar();

  return {ep_custom_inline_toolbar: settings.ep_custom_inline_toolbar, inlineButtons};
};

exports.padInitToolbar = (hookName, context) => {
  createInlineToolbar = createInlineToolbar.bind(context);
};


exports.eejsBlock_body = (hookName, args, cb) => {
  args.content += eejs.require('ep_custom_inline_toolbar/templates/menuButtons.ejs');

  return cb();
};

exports.eejsBlock_mySettings = (hookName, args, cb) => {
  args.content += eejs.require('ep_custom_inline_toolbar/templates/settings.ejs');

  return cb();
};

// not used
exports.eejsBlock_styles = (hookName, args, cb) => {
  args.content += eejs.require('ep_custom_inline_toolbar/templates/styles.html', {}, module);

  return cb();
};
