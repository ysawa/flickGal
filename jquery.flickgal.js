(function() {
  /*
  
   jQuery flickGal 1.2
   
   Copyright (c) 2011 Soichi Takamura (http://stakam.net/jquery/flickgal/demo)
   
   Dual licensed under the MIT and GPL licenses:
   http://www.opensource.org/licenses/mit-license.php
   http://www.gnu.org/licenses/gpl.html
   
  */
  /*
    init variables about browsers environment
  */
  var BrowserType, CSS_PREFIX, CSS_TRANSFORM, CSS_TRANSFORM_ORIGIN, CSS_TRANSITION, EventType, TRANSLATE_PREFIX, TRANSLATE_SUFFIX, currentBrowser, getCssTranslateValue, isAndroid, isIOS, isMobile, userAgent;
  BrowserType = {
    WEBKIT: 0,
    GECKO: 1,
    MSIE: 2,
    OPERA: 3,
    OTHER: 4
  };
  userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf('webkit') >= 0) {
    currentBrowser = BrowserType.WEBKIT;
  } else if (userAgent.indexOf('gecko') >= 0) {
    currentBrowser = BrowserType.GECKO;
  } else if (userAgent.indexOf('msie') >= 0) {
    currentBrowser = BrowserType.MSIE;
  } else if (userAgent.indexOf('opera') >= 0) {
    currentBrowser = BrowserType.OPERA;
  } else {
    currentBrowser = BrowserType.OTHER;
  }
  isIOS = userAgent.indexOf('iphone') >= 0 || userAgent.indexOf('ipad') >= 0;
  isAndroid = userAgent.indexOf('android') >= 0;
  isMobile = isIOS || isAndroid;
  switch (currentBrowser) {
    case BrowserType.WEBKIT:
      CSS_PREFIX = '-webkit-';
      break;
    case BrowserType.GECKO:
      CSS_PREFIX = '-moz-';
      break;
    case BrowserType.MSIE:
      CSS_PREFIX = '-ms-';
      break;
    case BrowserType.OPERA:
      CSS_PREFIX = '-o-';
      break;
    case BrowserType.OTHER:
      CSS_PREFIX = '';
  }
  CSS_TRANSITION = CSS_PREFIX + 'transition';
  CSS_TRANSFORM = CSS_PREFIX + 'transform';
  CSS_TRANSFORM_ORIGIN = CSS_PREFIX + 'transform-origin';
  TRANSLATE_PREFIX = currentBrowser === BrowserType.WEBKIT ? 'translate3d(' : 'translate(';
  TRANSLATE_SUFFIX = currentBrowser === BrowserType.WEBKIT ? 'px,0,0)' : 'px,0)';
  EventType = {
    START: isMobile ? 'touchstart' : 'mousedown',
    END: isMobile ? 'touchend' : 'mouseup',
    MOVE: isMobile ? 'touchmove' : 'mousemove',
    TRANSITION_END: currentBrowser === BrowserType.WEBKIT ? 'webkitTransitionEnd' : currentBrowser === BrowserType.OPERA ? 'oTransitionEnd' : 'transitionend',
    ORIENTATION_CHAGE: 'orientationchange',
    CLICK: 'click',
    RESIZE: 'resize'
  };
  if (isAndroid) {
    EventType.ORIENTATION_CHAGE = "" + EventType.ORIENTATION_CHAGE + " " + EventType.RESIZE;
  }
  /*
    common function
  */
  getCssTranslateValue = function(translateX) {
    return [TRANSLATE_PREFIX, translateX, TRANSLATE_SUFFIX].join('');
  };
  /*
    implement plugin
  */
  window['jQuery']['fn']['flickGal'] = function(options) {
    /*
        option
      */    options = $['extend']({
      'infinitCarousel': false,
      'lockScroll': true
    }, options);
    /*
        iterate each element in jQuery object
      */
    return this['each'](function() {
      /*
            private variables
          */
      var $box, $container, $flickBox, $items, $nav, $navA, $navChildren, $next, $prev, box, boxHeight, boxWidth, cd, containerBaseX, containerOffsetLeft, disableArrow, endX, getGeckoTranslateX, getTranslateX, isMoving, itemLength, itemWidth, maxLeft, minLeft, moveToIndex, nextTappedHandler, prevTappedHandler, redefineLeftOffset, startLeft, startTime, startX, touchEvents, touchHandler, transitionEndHandler, useArrows, useNav;
      $flickBox = $(this);
      $container = $('.container', $flickBox)['css']({
        overflow: 'hidden'
      });
      $box = $('.containerInner', $container)['css']({
        position: 'relative',
        overflow: 'hidden',
        top: 0,
        left: 0
      });
      $items = $('.item', $box)['css']({
        'float': 'left'
      });
      itemLength = $items['length'];
      itemWidth = $items['outerWidth'](true);
      boxWidth = itemWidth * itemLength;
      boxHeight = $items['outerHeight'](true);
      minLeft = 0;
      maxLeft = ((itemWidth * itemLength) - itemWidth) * -1;
      cd = 0;
      containerOffsetLeft = 0;
      containerBaseX = 0;
      /*
            private functions
          */
      getGeckoTranslateX = function($elm) {
        var translateX;
        try {
          translateX = window['parseInt'](/(,.+?){3} (.+?)px/.exec($elm['css'](CSS_TRANSFORM))[2]);
          if (!window['isNaN'](translateX)) {
            return translateX + containerOffsetLeft;
          } else {
            return 0;
          }
        } catch (_e) {}
        return 0;
      };
      getTranslateX = function() {
        if (currentBrowser !== BrowserType.GECKO) {
          return $box['offset']()['left'];
        } else {
          return getGeckoTranslateX($box);
        }
      };
      redefineLeftOffset = function(e) {
        containerOffsetLeft = $container['offset']()['left'];
        containerBaseX = ($container['innerWidth']() - itemWidth) / 2;
        return moveToIndex(cd);
      };
      /*
            implement navigation
          */
      $nav = $('.nav', $flickBox);
      $navA = $nav['find']('a[href^=#]');
      $navChildren = $navA['parent']();
      useNav = !!($nav['length'] && $navA['length'] && $navChildren['length']);
      /*
            implement next/prev arrows
          */
      $prev = $('.prev', $flickBox);
      $next = $('.next', $flickBox);
      useArrows = !!($prev['length'] && $next['length']);
      if (useArrows) {
        prevTappedHandler = function() {
          cd = cd > 0 ? cd - 1 : options['infinitCarousel'] ? itemLength - 1 : cd;
          return moveToIndex(cd);
        };
        nextTappedHandler = function() {
          cd = cd < itemLength - 1 ? cd + 1 : options['infinitCarousel'] ? 0 : cd;
          return moveToIndex(cd);
        };
        disableArrow = function() {
          $prev.add($next)['removeClass']('off');
          if (cd === 0) {
            return $prev['addClass']('off');
          } else {
            if (cd === itemLength - 1) {
              return $next['addClass']('off');
            }
          }
        };
      }
      /*
            implement core event handling
          */
      startX = 0;
      endX = 0;
      startTime = 0;
      startLeft = 0;
      isMoving = false;
      touchHandler = function(e) {
        var diffX, touch;
        touch = isMobile ? e.touches[0] : e;
        switch (e.type) {
          case EventType.MOVE:
            if (options['lockScroll']) {
              e.preventDefault();
            }
            if (isMoving) {
              diffX = containerBaseX + touch.pageX - startX;
              return $box['css'](CSS_TRANSFORM, getCssTranslateValue(startLeft + diffX));
            }
            break;
          case EventType.START:
            if (!isMobile) {
              e.preventDefault();
            }
            isMoving = true;
            startTime = (new Date()).getTime();
            startX = isMobile ? touch.pageX : e.clientX;
            startLeft = getTranslateX() - containerOffsetLeft - containerBaseX;
            if ($box['hasClass']('moving')) {
              return $box['removeClass']('moving')['css'](CSS_TRANSFORM, getCssTranslateValue(containerBaseX + startLeft));
            }
            break;
          case EventType.END:
            startLeft = 0;
            isMoving = false;
            endX = isMobile ? e.changedTouches[0].pageX : e.clientX;
            return moveToIndex();
        }
      };
      transitionEndHandler = function() {
        return $box['removeClass']('moving');
      };
      moveToIndex = function(opt_cd) {
        var currX, d, distanceX, endTime, timeDiff;
        $box['addClass']('moving');
        if (typeof opt_cd === 'number') {
          cd = opt_cd;
        } else {
          endTime = new Date().getTime();
          timeDiff = endTime - startTime;
          distanceX = endX - startX;
          if (timeDiff < 300 && Math.abs(distanceX) > 30) {
            if (distanceX > 0) {
              cd--;
            } else {
              cd++;
            }
          } else {
            currX = getTranslateX() - containerOffsetLeft;
            d = Math.abs((minLeft + currX) - containerBaseX - itemWidth / 2);
            cd = Math.floor(d / itemWidth);
          }
        }
        if (cd > itemLength - 1) {
          cd = itemLength - 1;
        } else {
          if (cd < 0) {
            cd = 0;
          }
        }
        $box['css'](CSS_TRANSFORM, getCssTranslateValue(containerBaseX + itemWidth * cd * -1));
        if (useNav) {
          $navChildren['removeClass']('selected')['eq'](cd)['addClass']('selected');
        }
        if (useArrows) {
          return disableArrow();
        }
      };
      /*
            initialize base variable and bind events
          */
      $container['height'](boxHeight)['scroll'](function() {
        return $(this)['scrollLeft'](0);
      });
      $box['height'](boxHeight)['width'](boxWidth)['css'](CSS_TRANSFORM, getCssTranslateValue(getTranslateX()));
      $(window)['bind']((isMobile ? EventType.ORIENTATION_CHAGE : EventType.RESIZE), redefineLeftOffset);
      redefineLeftOffset();
      if (useNav) {
        $navChildren['eq'](0)['addClass']('selected');
        $navA['bind'](EventType.START, function(e) {
          var index;
          index = $navA['index'](this);
          moveToIndex(index);
          return false;
        })['bind'](EventType.CLICK, function() {
          return false;
        });
      }
      if (useArrows) {
        $prev['bind'](EventType.START, prevTappedHandler);
        $next['bind'](EventType.START, nextTappedHandler);
        disableArrow();
      }
      touchEvents = [EventType.MOVE, EventType.START, EventType.END];
      if (isMobile) {
        box = $box[0];
        $['each'](touchEvents, function(i, e) {
          return box.addEventListener(e, touchHandler, false);
        });
        return box.addEventListener(EventType.TRANSITION_END, transitionEndHandler, false);
      } else {
        return $box['bind'](touchEvents.join(' '), touchHandler)['bind'](EventType.TRANSITION_END, transitionEndHandler);
      }
    });
  };
}).call(this);
