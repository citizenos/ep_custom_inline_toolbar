'use strict';

const _ = require('ep_etherpad-lite/static/js/underscore');
const padEditBar = require('ep_etherpad-lite/static/js/pad_editbar').padeditbar;
const Security = require('ep_etherpad-lite/static/js/security');

const cloneLine = (line) => {
  const padOuter = $('iframe[name="ace_outer"]').contents();
  const padInner = padOuter.find('iframe[name="ace_inner"]');

  const lineElem = $(line.lineNode);
  const lineClone = lineElem.clone();
  const innerdocbodyMargin = $(lineElem).parent().css('margin-left') || 0;
  padInner.contents().find('body').append(lineClone);
  lineClone.css({position: 'absolute'});
  lineClone.css(lineElem.offset());
  lineClone.css({color: 'red'});
  lineClone.css({left: innerdocbodyMargin});
  lineClone.width(lineElem.width());

  return lineClone;
};

let getLineAtIndex = function (index) {
  return this.rep.lines.atIndex(index);
};

let isHeading = function (index) {
  const attribs = this.documentAttributeManager.getAttributesOnLine(index);
  for (let i = 0; i < attribs.length; i++) {
    if (attribs[i][0] === 'heading') {
      const value = attribs[i][1];
      i = attribs.length;

      return value;
    }
  }

  return false;
};

// Given a rep we get the X and Y px offset
const getXYOffsetOfRep = (selStart, selEnd) => {
  let viewPosition = 'bottom';
  if (clientVars.ep_custom_inline_toolbar && clientVars.ep_custom_inline_toolbar.position) {
    viewPosition = clientVars.ep_custom_inline_toolbar.position;
  }
  let clone;
  let startIndex = 0;
  let endIndex = 0;

  if (
    selStart[0] > selEnd[0] ||
    (selStart[0] === selEnd[0] && selStart[1] > selEnd[1])) { // make sure end is after start
    const startPos = _.clone(selStart);
    selEnd = selStart;
    selStart = startPos;
  }

  const padOuter = $('iframe[name="ace_outer"]').contents();
  const padInner = padOuter.find('iframe[name="ace_inner"]');

  // Get the target Line
  const startLine = getLineAtIndex(selStart[0]);
  const endLine = getLineAtIndex(selEnd[0]);
  const innerPadding = parseInt(padInner.css('padding-left'));
  let leftOffset = $(padInner)[0].offsetLeft + $('iframe[name="ace_outer"]')[0].offsetLeft + innerPadding;
  if ($(padInner)[0]) {
    leftOffset += 3; // it appears on apple devices this might not be set properly?
  }
  // Add support for page view margins
  let divMargin = $(startLine.lineNode).css('margin-left');
  const innerdocbodyMargin = parseInt($(startLine.lineNode).parent().css('margin-left')) || 0;
  let lineText = [];
  let lineIndex = 0;

  if (viewPosition === 'top') {
    startIndex = selStart[1];
    lineIndex = selStart[0];
    lineText = Security.escapeHTML($(startLine.lineNode).text()).split('');
    endIndex = lineText.length - 1;
    clone = cloneLine(startLine);
    if (selStart[0] === selEnd[0]) {
      endIndex = selEnd[1];
    }
  } else {
    endIndex = selEnd[1];
    lineIndex = selEnd[0];
    lineText = Security.escapeHTML($(endLine.lineNode).text()).split('');
    clone = cloneLine(endLine);
    if (selStart[0] === selEnd[0]) {
      startIndex = selStart[1];
    }
  }

  lineText.splice(endIndex, 0, '</span>');
  lineText.splice(startIndex, 0, '<span id="selectWorker">');
  lineText = lineText.join('');
  const toolbarMargin = parseInt(padOuter.find('#custom_inline_toolbar').children().css('margin-left'));
  const heading = isHeading(lineIndex);
  if (heading) {
    lineText = `<${heading}>${lineText}</${heading}>`;
  }
  $(clone).html(lineText);

  // Is the line visible yet?
  if ($(startLine.lineNode).length !== 0) {
    const worker = $(clone).find('#selectWorker');
    const workerOffset = worker.offset();
    const innerOffset = padInner.offset();
    const innerPaddingTop = parseInt(padInner.css('padding-top'));
    const wWidth = $(worker).width();
    const itbwidth = padOuter.find('#custom_inline_toolbar').width();

    let top = workerOffset.top + innerOffset.top + innerPaddingTop; // A standard generic offset'
    let left = (workerOffset.left || 0) + leftOffset + toolbarMargin + wWidth / 2 - itbwidth / 2;

    // adjust position
    if (viewPosition === 'top') {
      top -= padOuter.find('#custom_inline_toolbar')[0].offsetHeight;
      if (top <= 0) { // If the tooltip wont be visible to the user because it's too high up
        top += worker[0].offsetHeight;
        if (top < 0) { top = 0; } // handle case where caret is in 0,0
      }
    } else if (viewPosition === 'bottom') {
      top += worker[0].offsetHeight;
    } else if (viewPosition === 'right') {
      left = worker.offset().left + worker[0].offsetWidth + leftOffset + toolbarMargin;
      top += (worker[0].offsetHeight / 2);
    } else if (viewPosition === 'left') {
      left = 0;
      if (divMargin) {
        divMargin = parseInt(divMargin);
        if ((divMargin + innerdocbodyMargin) > 0) {
          left += divMargin;
        }
      }
      left -= worker.width();
      top += (worker[0].offsetHeight / 2);
    }

    padOuter.find('#custom_inline_toolbar').find('.menu_inline').removeClass('arrow_left');
    padOuter.find('#custom_inline_toolbar').find('.menu_inline').removeClass('arrow_right');
    if (left < 0) {
      left = 0;
      padOuter.find('#custom_inline_toolbar').find('.menu_inline').addClass('arrow_left');
    }
    if (left > padInner.width() - padOuter.find('#custom_inline_toolbar')[0].offsetWidth) {
      left = padInner.width() - padOuter.find('#custom_inline_toolbar')[0].offsetWidth;
      padOuter.find('#custom_inline_toolbar').find('.menu_inline').addClass('arrow_right');
    }

    // Remove the clone element
    $(clone).remove();
    return [left, top];
  }
};

// Draws the toolbar onto the screen
const drawAt = (XY) => {
  const padOuter = $('iframe[name="ace_outer"]').contents().find('body');
  const toolbar = padOuter.find('#custom_inline_toolbar');

  toolbar.show();
  toolbar.css({
    position: 'absolute',
    left: XY[0],
    top: XY[1],
  });
};

const iT = {
  hide() {
    const padOuter = $('iframe[name="ace_outer"]').contents().find('body');
    const inlineToolbar = padOuter.find('#custom_inline_toolbar');
    if (!inlineToolbar.length) return;
    $(inlineToolbar).removeClass('popup-show');
    $(inlineToolbar).hide();
  },
  show(selStart, selEnd) {
    const padOuter = $('iframe[name="ace_outer"]').contents().find('body');
    const inlineToolbar = padOuter.find('#custom_inline_toolbar');
    if (!inlineToolbar.length) return;
    $(inlineToolbar).addClass('popup-show');
    $(inlineToolbar).show();
    html10n.translateElement(html10n.translations, inlineToolbar.get(0));
    const XY = getXYOffsetOfRep(selStart, selEnd);
    this.draw(XY);
  },
  draw(XY) {
    drawAt(XY);
  },
};

exports.aceSelectionChanged = (hook, context) => {
  if (!clientVars.inlineButtons.length) return;
  const selStart = context.rep.selStart;
  const selEnd = context.rep.selEnd;
  if ((selStart[0] !== selEnd[0]) || (selStart[1] !== selEnd[1])) {
    iT.show(selStart, selEnd);
  } else {
    iT.hide();
  }
};

exports.postAceInit = function () {
  iT.hide();

  const padOuter = $('iframe[name="ace_outer"]').contents().find('body');
  padOuter.on('click', () => {
    iT.hide();
  });

  $('#custom_inline_toolbar [data-key]').each(function () {
    $(this).unbind('click');
    const command = $(this).data('key');

    if ($(this).data('type') === 'link') {
      $(this).addClass('link');
      const spanItem = $(this).find('span.buttonicon')[0];
      const translationId = $(spanItem).data('l10n-id');

      $(spanItem).html(html10n.get(translationId));
    }
    $(this).on('click', function () {
      iT.hide();
      padEditBar.triggerCommand(command, $(this));
    });
  });

  $('#custom_inline_toolbar').detach().appendTo(padOuter[0]);
};

exports.aceInitialized = (hook, context) => {
  getLineAtIndex = _(getLineAtIndex).bind(context);
  isHeading = _(isHeading).bind(context);
};

exports.postToolbarInit = () => {
  if (clientVars.inlineButtons && clientVars.inlineButtons.length) {
    $.each(clientVars.inlineButtons, (key, item) => {
      $('#custom_inline_toolbar_menu_items').append(item);
    });
  }
};

exports.aceEditorCSS = () => ['ep_custom_inline_toolbar/static/css/inline-toolbar.css'];
