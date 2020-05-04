/* The MIT License (MIT)
Copyright (c) 2014-2015 Benoit Tremblay <trembl.ben@gmail.com>
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */
/* global define, VimeoPlayer*/
(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    const videojs = require('video.js');

    module.exports = factory(videojs.default || videojs);
  } else if (typeof define === 'function' && define.amd) {
    define(['videojs'], function(videojs) {
      return (root.Vimeo = factory(videojs));
    });
  } else {
    root.Vimeo = factory(root.videojs);
  }
})(this, function(videojs) {
  'use strict';

  const VimeoPlayer = require('@vimeo/player');

  const _isOnMobile =
    videojs.browser.IS_IOS || videojs.browser.IS_NATIVE_ANDROID;
  const Tech = videojs.getTech('Tech');

  const Vimeo = videojs.extend(Tech, {
    // constructor(options, ready) {
    //   super(options, ready);

    //   injectCss();
    //   this.setPoster(options.poster);
    //   this.initVimeoPlayer();
    // }
    constructor(options, ready) {
      Tech.call(this, options, ready);

      this.setPoster(options.poster);
      // this.setSrc(this.options_.source, true);

      // Set the vjs-vimeo class to the player
      // Parent is not set yet so we have to wait a tick
      this.setTimeout(function() {
        if (this.el_) {
          this.el_.parentNode.className += ' vjs-vimeo';

          if (_isOnMobile) {
            this.el_.parentNode.className += ' vjs-vimeo-mobile';
          }

          if (Vimeo.isApiReady) {
            this.initVimeoPlayer();
          } else {
            Vimeo.apiReadyQueue.push(this);
          }
        }
      }.bind(this));
    },

    initVimeoPlayer() {
      const vimeoOptions = {
        url: this.options_.source.src,
        byline: false,
        portrait: false,
        title: false
      };

      if (this.options_.autoplay) {
        vimeoOptions.autoplay = true;
      }
      if (this.options_.height) {
        vimeoOptions.height = this.options_.height;
      }
      if (this.options_.width) {
        vimeoOptions.width = this.options_.width;
      }
      if (this.options_.maxheight) {
        vimeoOptions.maxheight = this.options_.maxheight;
      }
      if (this.options_.maxwidth) {
        vimeoOptions.maxwidth = this.options_.maxwidth;
      }
      if (this.options_.loop) {
        vimeoOptions.loop = this.options_.loop;
      }
      if (this.options_.color) {
        // vimeo is the only API on earth to reject hex color with leading #
        vimeoOptions.color = this.options_.color.replace(/^#/, '');
      }

      this._player = new VimeoPlayer(this.el(), vimeoOptions);
      this.initVimeoState();

      ['play', 'pause', 'ended', 'timeupdate', 'progress', 'seeked'].forEach((e) => {
        this._player.on(e, (progress) => {
          if (this._vimeoState.progress.duration !== progress.duration) {
            this.trigger('durationchange');
          }
          this._vimeoState.progress = progress;
          this.trigger(e);
        });
      });

      this._player.on('pause', () => (this._vimeoState.playing = false));
      this._player.on('play', () => {
        this._vimeoState.playing = true;
        this._vimeoState.ended = false;
      });
      this._player.on('ended', () => {
        this._vimeoState.playing = false;
        this._vimeoState.ended = true;
      });
      this._player.on('volumechange', (v) => (this._vimeoState.volume = v));
      this._player.on('error', (e) => this.trigger('error', e));

      this.triggerReady();
    },

    initVimeoState() {
      const state = (this._vimeoState = {
        ended: false,
        playing: false,
        volume: 0,
        progress: {
          seconds: 0,
          percent: 0,
          duration: 0
        }
      });

      this._player
        .getCurrentTime()
        .then((time) => (state.progress.seconds = time));
      this._player
        .getDuration()
        .then((time) => (state.progress.duration = time));
      this._player.getPaused().then((paused) => (state.playing = !paused));
      this._player.getVolume().then((volume) => (state.volume = volume));
    },

    createEl() {
      const div = document.createElement('div');

      div.setAttribute('id', this.options_.techId);
      div.setAttribute(
        'style',
        'width:100%;height:100%;top:0;left:0;position:absolute'
      );
      div.setAttribute('class', 'vjs-tech');

      const divWrapper = document.createElement('div');

      divWrapper.appendChild(div);

      if (!_isOnMobile && !this.options_.ytControls) {
        const divBlocker = document.createElement('div');

        divBlocker.setAttribute('class', 'vjs-iframe-blocker');
        divBlocker.setAttribute(
          'style',
          'position:absolute;top:0;left:0;width:100%;height:100%'
        );

        // In case the blocker is still there and we want to pause
        divBlocker.onclick = function() {
          this.pause();
        }.bind(this);

        divWrapper.appendChild(divBlocker);
      }

      return divWrapper;
    },

    controls() {
      return true;
    },

    supportsFullScreen() {
      return true;
    },

    src() {
      // @note: Not sure why this is needed but videojs requires it
      return this.options_.source;
    },

    currentSrc() {
      return this.options_.source.src;
    },

    // @note setSrc is used in other usecases (YouTube, Html) it doesn't seem required here
    // setSrc() {}

    currentTime() {
      return this._vimeoState.progress.seconds;
    },

    setCurrentTime(time) {
      this._player.setCurrentTime(time);
    },

    volume() {
      return this._vimeoState.volume;
    },

    setVolume(volume) {
      return this._player.setVolume(volume);
    },

    muted() {
      return this._vimeoState.volume === 0;
    },

    setMuted(mute) {
      // if (this.muted()) {
      //   mute = false;
      //   this._vimeoState.volume = 1;
      // } else {
      //   this._vimeoState.volume = 0;
      // }

      this._player.setMuted(mute);

      this.setTimeout(function() {
        this.trigger('volumechange');
      }, 50);
    },

    duration() {
      return this._vimeoState.progress.duration;
    },

    buffered() {
      const progress = this._vimeoState.progress;

      return videojs.createTimeRange(0, progress.percent * progress.duration);
    },

    paused() {
      return !this._vimeoState.playing;
    },

    pause() {
      this._player.pause();
    },

    play() {
      this._player.play();
    },

    ended() {
      return this._vimeoState.ended;
    },

    playbackRate() {
      return this._player ? this._player.getPlaybackRate() : 1;
    },

    setPlaybackRate(suggestedRate) {
      if (!this._player) {
        return;
      }

      this._player.setPlaybackRate(suggestedRate);
    }
  });

  // Vimeo.prototype.featuresTimeupdateEvents = true;

  Vimeo.isSupported = function() {
    return true;
  };

  Vimeo.canPlaySource = function(e) {
    return Vimeo.canPlayType(e.type);
  };

  Vimeo.canPlayType = function(e) {
    return e === 'video/vimeo';
  };
  // // Add Source Handler pattern functions to this tech
  // Tech.withSourceHandlers(Vimeo);

  // Vimeo.nativeSourceHandler = {};

  // Vimeo.nativeSourceHandler.canPlayType = function (source) {
  //   if (source === 'video/vimeo') {
  //     return 'maybe';
  //   }

  //   return '';
  // };

  // Vimeo.nativeSourceHandler.canHandleSource = function (source) {
  //   if (source.type) {
  //     return Vimeo.nativeSourceHandler.canPlayType(source.type);
  //   } else if (source.src) {
  //     return Vimeo.nativeSourceHandler.canPlayType(source.src);
  //   }

  //   return '';
  // };

  // @note: Copied over from YouTube — not sure this is relevant
  // Vimeo.nativeSourceHandler.handleSource = function (source, tech) {
  //   tech.src(source.src);
  // };

  // @note: Copied over from YouTube — not sure this is relevant
  // Vimeo.nativeSourceHandler.dispose = function () {};

  // Vimeo.registerSourceHandler(Vimeo.nativeSourceHandler);

  // Include the version number.
  Vimeo.VERSION = '0.1.1';

  // ported over code from youtube

  function apiLoaded() {
    // Vimeo._player.ready().then(function () {
    Vimeo.isApiReady = true;

    for (let i = 0; i < Vimeo.apiReadyQueue.length; ++i) {
      Vimeo.apiReadyQueue[i].initVimeoPlayer();
    }
    // });
  }

  // iframe blocker to catch mouse events
  function injectCss() {
    const css =
      '.vjs-vimeo .vjs-iframe-blocker { display: none; }' +
      '.vjs-vimeo.vjs-user-inactive .vjs-iframe-blocker { display: block; }' +
      '.vjs-vimeo .vjs-poster { background-size: cover; }' +
      '.vjs-vimeo-mobile .vjs-big-play-button { display: none; }' +
      '.vjs-vimeo iframe { position: absolute; top: 0; left: 0; width: 100%; height:100%; }';

    const head = document.head || document.getElementsByTagName('head')[0];

    const style = document.createElement('style');

    style.type = 'text/css';

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
  }

  Vimeo.apiReadyQueue = [];

  if (typeof document !== 'undefined') {
    apiLoaded();
    injectCss();
  }

  // Older versions of VJS5 doesn't have the registerTech function
  if (typeof videojs.registerTech !== 'undefined') {
    videojs.registerTech('Vimeo', Vimeo);
  } else {
    videojs.registerComponent('Vimeo', Vimeo);
  }
});
