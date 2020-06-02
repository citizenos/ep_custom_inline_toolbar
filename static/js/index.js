var _, $, jQuery;
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;
var padEditBar = require('ep_etherpad-lite/static/js/pad_editbar').padeditbar;
var Security = require('ep_etherpad-lite/static/js/security');

var globalKey = 0;
var settingToolbar = false;

iT = {
  hide: function(){
    var padOuter = $('iframe[name="ace_outer"]').contents().find("body");
    var inlineToolbar = padOuter.find("#inline_toolbar");
    $(inlineToolbar).removeClass('popup-show');
    $(inlineToolbar).hide();
  },
  show: function(selStart, selEnd){
    var padOuter = $('iframe[name="ace_outer"]').contents().find("body");
    var inlineToolbar = padOuter.find("#inline_toolbar");
    $(inlineToolbar).addClass('popup-show');
    $(inlineToolbar).show();
    var XY = getXYOffsetOfRep(selStart, selEnd);
    this.draw(XY);
  },
  draw: function(XY){
    drawAt(XY);
  }
}

exports.aceSelectionChanged = function(hook, context){
  var selStart = context.rep.selStart;
  var selEnd = context.rep.selEnd;
  if((selStart[0] !== selEnd[0]) || (selStart[1] !== selEnd[1])){
    iT.show(selStart, selEnd);
  }else{
    iT.hide();
  }
}


var cloneLine = function (line) {
  var padOuter = $('iframe[name="ace_outer"]').contents();
  var padInner = padOuter.find('iframe[name="ace_inner"]');

  var lineElem = $(line.lineNode);
  var lineClone = lineElem.clone();
  var innerdocbodyMargin = $(lineElem).parent().css("margin-left") || 0;
  padInner.contents().find('body').append(lineClone);
  lineClone.css({position: 'absolute'});
  lineClone.css(lineElem.offset());
  lineClone.css({color:'red'});
  lineClone.css({left: innerdocbodyMargin});
  lineClone.width(lineElem.width());

  return lineClone;
};

// Given a rep we get the X and Y px offset
function getXYOffsetOfRep(selStart, selEnd){
  var viewPosition = clientVars.ep_inline_toolbar.position || 'bottom';
  var clone;
  var startIndex = 0;
  var endIndex = 0;

  if (selStart[0] > selEnd [0] || (selStart[0] === selEnd[0] && selStart[1] > selEnd[1])) { //make sure end is after start
    var startPos = _.clone(selStart);
    selEnd = selStart;
    selStart = startPos;
  }

  var padOuter = $('iframe[name="ace_outer"]').contents();
  var padInner = padOuter.find('iframe[name="ace_inner"]');

  // Get the target Line
  var startLine = getLineAtIndex(selStart[0]);
  var endLine = getLineAtIndex(selEnd[0]);
  var leftOffset = $(padInner)[0].offsetLeft + $('iframe[name="ace_outer"]')[0].offsetLeft + parseInt(padInner.css('padding-left'));
  if($(padInner)[0]){
    leftOffset = leftOffset +3; // it appears on apple devices this might not be set properly?
  }
  // Add support for page view margins
  var divMargin = $(startLine.lineNode).css("margin-left");
  var innerdocbodyMargin = parseInt($(startLine.lineNode).parent().css("margin-left")) || 0;
  var lineText = [];
  var lineIndex = 0;

  if (viewPosition === 'top') {
    startIndex = selStart[1];
    lineIndex = selStart[0];
    lineText = Security.escapeHTML($(startLine.lineNode).text()).split('');
    endIndex = lineText.length-1;
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
  var toolbarMargin = parseInt(padOuter.find("#inline_toolbar").children().css('margin-left'));
  var heading = isHeading(lineIndex);
  if (heading) {
    lineText = '<' + heading + '>' + lineText + '</' + heading + '>';
  }
  $(clone).html(lineText);

  // Is the line visible yet?
  if ( $(startLine.lineNode).length !== 0 ) {

    var worker =  $(clone).find('#selectWorker');
    var top = worker.offset().top + padInner.offset().top + parseInt(padInner.css('padding-top')); // A standard generic offset'
    var left = (worker.offset().left || 0) + leftOffset + toolbarMargin + $(worker).width()/2 - padOuter.find("#inline_toolbar").width()/2;

    //adjust position
    if (viewPosition === 'top') {
      top = top - padOuter.find("#inline_toolbar")[0].offsetHeight;
      if(top <= 0 ) {  // If the tooltip wont be visible to the user because it's too high up
        top = top + worker[0].offsetHeight;
        if(top < 0){ top = 0; } // handle case where caret is in 0,0
      }
    } else if (viewPosition === 'bottom') {
      top = top + worker[0].offsetHeight;
    } else if (viewPosition === 'right') {
      left = worker.offset().left + worker[0].offsetWidth + leftOffset + toolbarMargin;
      top = top +(worker[0].offsetHeight/2);
    } else if (viewPosition === 'left') {
      left = 0;
      if (divMargin) {
        divMargin = parseInt(divMargin);
        if ((divMargin + innerdocbodyMargin) > 0) {
          left = left + divMargin;
        }
      }
      left = left - worker.width();
      top  = top +(worker[0].offsetHeight/2);
    }

    padOuter.find("#inline_toolbar").find('.menu_inline').removeClass('arrow_left');
    padOuter.find("#inline_toolbar").find('.menu_inline').removeClass('arrow_right');
    if (left < 0) {
      left = 0;
      padOuter.find("#inline_toolbar").find('.menu_inline').addClass('arrow_left');
    }
    if (left > padInner.width() - padOuter.find("#inline_toolbar")[0].offsetWidth) {
      left = padInner.width() - padOuter.find("#inline_toolbar")[0].offsetWidth;
      padOuter.find("#inline_toolbar").find('.menu_inline').addClass('arrow_right');
    }

    // Remove the clone element
    $(clone).remove();
    return [left, top];
  }
}

// Draws the toolbar onto the screen
function drawAt(XY){

  var padOuter = $('iframe[name="ace_outer"]').contents().find("body");
  var toolbar = padOuter.find("#inline_toolbar");

  toolbar.show();
  toolbar.css({
    "position": "absolute",
    "left": XY[0],
    "top": XY[1]
  });
}


exports.postAceInit = function (hook_name, context) {
  iT.hide();

  var padOuter = $('iframe[name="ace_outer"]').contents().find("body");
  padOuter.on('click', function () {
    iT.hide();
  });

  $("#inline_toolbar [data-key]").each(function () {
    $(this).unbind("click");
    var command = $(this).data('key');

    if ($(this).data('type') === 'link') {
      $(this).addClass('link');
      var spanItem = $(this).find('span.buttonicon')[0];
      var translationId = $(spanItem).data('l10n-id');

      $(spanItem).html(html10n.get(translationId));
    }
    $(this).on('click', function () {
      iT.hide();
      padEditBar.triggerCommand(command, $(this));
    });
  });

  $("#inline_toolbar").detach().appendTo(padOuter[0]);

}

var getLineAtIndex = function (index) {
  return this.rep.lines.atIndex(index);
}

var isHeading = function (index) {
   var attribs = this.documentAttributeManager.getAttributesOnLine(index);
  for (var i=0; i<attribs.length; i++) {
    if (attribs[i][0] === 'heading') {
      var value = attribs[i][1];
      i = attribs.length;
      return value;
    }
  }
  return false;
}

exports.aceInitialized = function(hook, context){
  getLineAtIndex = _(getLineAtIndex).bind(context);
  isHeading = _(isHeading).bind(context);
}

exports.postToolbarInit = function (hook, context) {
  if (clientVars.inlineButtons && clientVars.inlineButtons.length) {
    $.each(clientVars.inlineButtons, function (key, item) {
      $('#inline_toolbar_menu_items').append(item);
    });
  }
}

exports.aceEditorCSS = function () {
  return ["ep_inline_toolbar/static/css/inline-toolbar.css"];
};
