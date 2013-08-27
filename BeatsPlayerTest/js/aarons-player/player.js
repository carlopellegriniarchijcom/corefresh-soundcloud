(function($, undefined) {

  /**
   * Base URL for the SoundCloud API.
   * @type {string}
   * @const
   * @default 'https://api.soundcloud.com/'
   * @inner
   */
  var BASE_URL = 'https://api.soundcloud.com/';
  
  /**
   * The author's (Aaron L. Stephanus) User ID on SoundCloud.
   * Used as the default if the user has not previously used
   * the app, AND selected the profile of another user then
   * leaving the application without returning to the author's profile.
   * @type {string|integer}
   * @default '5264540'
   * @const
   * @inner
   */
  var MY_UID = '5264540';
  
  /**
   * The author's SoundCloud API client ID for this application.
   * @type {string}
   * @const
   * @inner
   */
  var CLIENT_ID = 'd1ff6e70e404598a6d6aea909d28875b';
  
  /**
   * The author's SoundCloud API client secret for this application.
   * @type {string}
   * @const
   * @inner
   */
  var CLIENT_SECRET = '6140665065f4d8443f555dd97ab69479';
  
  /**
   * The name of the key used to store/retrieve user profile data into/from
   * Local Storage.
   * @type {string}
   * @default 'user_data_storage_key'
   * @const
   * @inner
   */
  var USER_DATA_STORE_KEY = 'user_data_storage_key';
  
  /**
   * Name of the cookie that stores the user ID of the profile
   * last visited by the user.
   * @type {string}
   * @default 'aarons_player_profile_id'
   * @const
   * @inner
   */
  var PROFILE_COOKIE_NAME = 'aarons_player_profile_id';
  

  // Ensure that the SoundCloud SDK JavaScript is available.
  // If it is not then create the AaronsPlayer namespace on the
  // global window object with a 'state' property configured
  // to indicate a critical error condition.
  if (typeof(window.SC) !== 'object' || window.SC === null) {
    window.AaronsPlayer = {
      state: {
        error: new ReferenceError('The SoundCloud SDK is not available.'),
        critical: true
      }
    };
    
    // Freeze the namespace if the platform is capable,
    // and then return without constructing the soundcloud
    // integrated player.
    freezeIt(window.AaronsPlayer);  
    return;
  }
  
  
  // Initialize the SoundCloud SDK.
  SC.initialize({
    client_id: CLIENT_ID  
  });
  
  
  /**
   * @class The SCUserProfile class contains properties that define a single user profile on SoundCloud.
   * @param {Object} data Property value initialization object. Direct properties on this object are copied into the new instance.
   */
  function SCUserProfile(data) {
    
    console.debug('The data provided to the SCUserProfile constructor is as follows:');
    console.debug(data);
    if (typeof(data) === 'object' && data !== null) {
      return copyObject(data, this);
    }
  }
  
  SCUserProfile.prototype.id = 0;
  SCUserProfile.prototype.permalink = '';
  SCUserProfile.prototype.username = '';
  SCUserProfile.prototype.uri = '';
  SCUserProfile.prototype.permalink_url = '';
  SCUserProfile.prototype.avatar_url = '';
  SCUserProfile.prototype.country = '';
  SCUserProfile.prototype.full_name = '';
  SCUserProfile.prototype.city = '';
  SCUserProfile.prototype.description = '';
  SCUserProfile.prototype.discogs_name = '';
  SCUserProfile.prototype.myspace_name = '';
  SCUserProfile.prototype.website = '';
  SCUserProfile.prototype.website_title = '';
  SCUserProfile.prototype.online = false;
  SCUserProfile.prototype.track_count = 0;
  SCUserProfile.prototype.playlist_count = 0;
  SCUserProfile.prototype.followers_count = 0;
  SCUserProfile.prototype.following_count = 0;
  SCUserProfile.prototype.public_favorites_count = 0;
  SCUserProfile.prototype.toJSON = function() {
    return copyObject(this, {});
  };

  /**
   * Perform an asynchronous request for user profile sub-resources.
   * @param {string} name
   * @returns {Promise}
   * @private
   */
  SCUserProfile.prototype._getSubResource = function(name) {
    var defer = $.Deferred();
    
    // Check for cached subresource data.
    if (typeof(this[name]) !== 'undefined' && $.isArray(this[name])) {
      defer.resolve(this[name]);
      return defer.promise();
    }
    
    // Add the subresource property to the SCUserProfile instance.
    this[name] = [];
    
    // Perform the GET request for subresource data for 'this' user profile.
    if (getSCResource('/users/' + this.id + '/' + name + '.json', {client_id: CLIENT_ID}, getResourceCallback.bind(defer, this[name]))) {
      return defer.promise();
    }
    
    // Error state. Reject the promise with an error message.
    defer.reject('An error occurred while attempting to retrieve ' + name + ' data for the user profile for ' + this.username + '.');
    return defer.promise();  
  };
  
  /**
   * Perform an asynchronous GET request for tracks for the user.
   * @returns {Promise}
   */
  SCUserProfile.prototype.getTracks = function() {
    return this._getSubResource('tracks');
  };
  
  /**
   * Perform an asynchronous GET request for playlists for the user.
   * @returns {Promise}
   */
  SCUserProfile.prototype.getPlaylists = function() {
    return this._getSubResource('playlists');
  };
  
  
  /**
   * Perform an asynchronous GET request for followings data for the user.
   * @returns {Promise}
   */
  SCUserProfile.prototype.getFollowings = function() {
    return this._getSubResource('followings');  
  };
  
  /**
   * Perform an asynchronous GET request for followers data for the user.
   * @returns {Promise}
   */
  SCUserProfile.prototype.getFollowers = function() {
    return this._getSubResource('followers');  
  };
  
  
  /**
   * Perform an asynchronous GET request for favorites data for the user.
   * @returns {Promise}
   */
  SCUserProfile.prototype.getFavorites = function() {
    return this._getSubResource('favorites');
  };
  
  /**
   * Perform an asynchronous GET request for groups data for the user.
   * @returns {Promise}
   */
  SCUserProfile.prototype.getGroups = function() {
    return this._getSubResource('groups');
  };
  
  /**
   * Perform an asynchronous GET request for web profiles data for the user.
   * @returns {Promise} 
   */
  SCUserProfile.prototype.getWebProfiles = function() {
    return this._getSubResource('web-profiles');
  };
  
  /**
   * @class The SCUserProfileCache singleton encapsulates loaded/cached/stored
   * user profile data.
   * @see SCUserProfile
   */
  function SCUserProfileCache() {
    
    if (SCUserProfileCache._instance instanceof SCUserProfileCache) {
      return SCUserProfileCache._instance;
    }
    
    /**
     * Object hash for storing cached user profile objects.
     * @type {Object}
     * @inner
     * @private
     */
    var profiles = {};
    
    /**
     * Add a SCUserProfile object to the cache.
     * @param {SCUserProfile} profile
     * @returns {SCUserProfileCache}
     */
    this.addProfile = function(profile) {
      if (profile instanceof SCUserProfile) {
        profiles[profile.id.toString()] = profile;
      }
      return this;
    };
    
    /**
     * Return the count of cached user profiles.
     * @returns {integer}
     */
    this.getProfileCount = function() {
      var k = getObjectKeys(profiles);
      return k.length;
    };
    
    /**
     * Retrieve a single cached SCUserProfile object identified
     * by the user's username.
     * @param {string} uname
     * @returns {SCUserProfile|null}
     */
    this.getProfileByUsername = function(uname) {
      for (var p in profiles) {
        if (profiles.hasOwnProperty(p)) {
          var user_profile = profiles[p];
          if (user_profile.username === uname) {
            return user_profile;
          }
        }
      }
      return null;
    };
    
    /**
     * Return a profile by the user ID.
     * @param {string|integer} id
     * @returns {SCUserProfile|null}
     */
    this.getProfileById = function(id) {
      if (profiles.hasOwnProperty(id.toString())) {
        return profiles[id.toString()];
      }
      return null;
    };
    
    /**
     * Return a boolean indicating if a profile is present in the cache.
     * @param {string|integer} id
     * @returns {Boolean}
     */
    this.hasProfile = function(id) {
      return profiles.hasOwnProperty(id.toString());
    };
    
    /**
     * Persist the profile cache in Local Storage (if possible).
     * @returns {Boolean}
     */
    this.cacheProfiles = function() {
      if (!Modernizr.localstorage) {
        return false;
      }
      var store = window.localStorage;
      store.setItem(USER_DATA_STORE_KEY, JSON.stringify(profiles));
      return true;
    };
    
    /**
     * Load the user profile cache from local storage.
     * @returns {integer}
     */
    this.loadProfiles = function() {
      var count = 0;
      if (!Modernizr.localstorage) {
        return count;
      }  
      var store = window.localStorage;
      var data = store.getItem(USER_DATA_STORE_KEY);
      if (data === null) {
        return count;
      }
      
      for (var p in data) {
        profiles[p.id] = new SCUserProfile(p);
        ++count;
      }
      return count;
    };
    
  }
  
  /**
   * Singleton instance.
   * @type {SCUserProfileCache}
   * @private
   */
  SCUserProfileCache._instance = null;
  
  /**
   * Singleton instance retrieval.
   * @returns {SCUserProfileCache}
   */
  SCUserProfileCache.getInstance = function() {
    if (!(SCUserProfileCache._instance instanceof SCUserProfileCache)) {
      SCUserProfileCache._instance = new SCUserProfileCache();
    }
    return SCUserProfileCache._instance;
  };

  function AudioController() {
    
    var sound_object = null;
    
    this.setSoundObject = function(sound) {
      if (sound_object !== null && sound_object.playState === 1) {
        this.stop();
      }
      sound_object = sound;
      return this;
    };
    
    this.play = function() {
      if (sound_object === null) {
        return this;
      }
      if (sound_object.paused === true) {
        sound_object.resume();
        return this;
      }
      if (sound_object.playState === 1) {
        this.stop();
      }
      sound_object.play();
      return this;
    };
    
    this.pause = function() {
      if (sound_object === null || sound_object.playState === 0) {
        return this;
      }
      try {
        sound_object.pause();
      }
      catch (ex) {
        debugLog(ex);
      }
      return this;
    };
    
    
    this.stop = function() {
      if (sound_object === null || sound_object.playState === 0) {
        return this;
      }
      try {
        sound_object.stop();
      }
      catch (ex) {
        debugLog(ex);
      }
      return this;
    };
    
    this.setVolume = function(v) {
      if (sound_object === null) {
        return this;
      }
      try {
        sound_object.setVolume(v);
      }
      catch (ex) {
        debugLog(ex);
      }
      return this;
    };
    
    this.setPosition = function(ms) {
      var defer = $.Deferred();
      if (sound_object === null || !isInt(ms)) {
        defer.reject('Invalid Sound object, or playback position.');
        return defer.promise();
      }
      
      // If the position requested is beyond what has been loaded as so far
      // then queue the change in position. When enough data has been downloaded
      // the position will change and the Deferred Promise object will be resolved.
      if (sound_object.duration < ms) {
        queuePositionChange(ms, defer);
        return defer.promise();
      }
      
      try {
        sound_object.setPosition(ms);
        defer.resolve(ms);
      }
      catch (ex) {
        debugLog(ex);
        defer.reject(ex.message);
      }
      return defer.promise();
    };
    
    function queuePositionChange(ms, defer) {
      
      var tid = 0;
      var INTERVAL = 1000;
      
      function timeCheck() {
        if (sound_object.duration >= ms) {
          clearInterval(tid);
          tid = 0;
          try {
            sound_object.setPosition(ms);
            defer.resolve(ms);
          }
          catch (ex) {
            debugLog(ex);
            defer.reject(ex.message);
          }
        }
      }
      setInterval(timeCheck, INTERVAL);
    }
  }
  
  /**
   * Singleton instance.
   * @type {AudioController}
   * @private
   */
  AudioController._instance = null;
  
  /**
   * Return the singleton instance.
   * @returns AudioController
   */
  AudioController.getInstance = function() {
    if (!(AudioController._instance instanceof AudioController)) {
      AudioController._instance = new AudioController();
    }
    return AudioController._instance;
  };
  
//
// Angular controllers/modules
//
  
  
  /**
   * @class Angular controller class for SoundCloud user profiles.
   * @param {Object} $scope Angular scope object.
   */
  function ProfileCtrl($scope) {
    
    // Determine if the user has "left off" at a specific SoundCloud profile.
    // If not then default to using my own profile as the starting point.
    var last_profile_uid = readFromCookie(PROFILE_COOKIE_NAME);
    if (!last_profile_uid) {
      last_profile_uid = MY_UID;
    } else if (!isInt(last_profile_uid)) {
      last_profile_uid = MY_UID;
    }

    /**
     * @method
     * @name selectProfile
     * @description Update the model to a new SoundCloud User Profile.
     * @param {integer|string} uid User ID of the SoundCloud profile.
     * TODO: Update to use cached profiles if available.
     */
    $scope.selectProfile = function(uid) {
      if (!isInt(uid) || (uid == $scope.current_profile_uid)) {
        return;
      }
      var cache = SCUserProfileCache.getInstance();
      var profile = null;
      
      //
      // If there are items in the cache, and the identified profile
      // is already cached then retrieve it from the cache and apply
      // it to the model.
      //
      if (cache.getProfileCount() > 0 && cache.hasProfile(uid)) {
        profile = cache.getProfileById(uid);
        if (profile instanceof SCUserProfile) {
          $scope.current_profile_uid = uid;
          $scope.current_profile = profile;
          writeToCookie(PROFILE_COOKIE_NAME, uid);
          return;
        }
      }

      //
      // Store an empty object in the profile variable to be used
      // as the target storage object for the profile data.
      //
      profile = {};
      
      //
      // The requested profile is not cached. Therefore attempt the 
      // asynchronous loading of profile data, along with the tracks,
      // followers, and followings sub-resources.
      //
      var defer = $.Deferred();
      defer.promise().done(function(data) {
      
        $.mobile.changePage('#profile', {
          allowSamePageTransitions: true,
          changeHash: false,
          transition: 'slidedown'
        });
        
        // Create a new SCUserProfile object to represent
        // the loaded user profile data.
        profile = new SCUserProfile(data);
        
        //
        // Retrieve the profile's tracks,
        //    followers, and
        //    followings.
        // Then add the profile to the cache, and hide
        //    the loading widget.
        //
        profile.getTracks()
          .done(function() {
            profile.getFollowers()
              .done(function() {
                profile.getFollowings()
                  .done(function() {
                    
                    var TIMEOUT_MS = 1000;
                    
                    // Add the profile to the cache
                    cache.addProfile(profile);
                    
                    // Update the model
                    $scope.current_profile_uid = uid;
                    $scope.current_profile = profile;
                    
                    // Hide the Loading Widget finally.
                    $.mobile.loading('hide');
                    
                    // Persist the User ID of the selected user profile in a cookie
                    // for use upon later visits to the application.
                    writeToCookie(PROFILE_COOKIE_NAME, uid);
                 
                    //
                    // Hackerifick! trigger 'create' after a brief timeout.
                    // then show the page content after another brief timeout.
                    // I don't know how else to deal with this yet.
                    //
                    
                    // First navigate back in the history.
                    // For some reason I need to do this, and I haven't
                    // figured out why yet. Possibly this has something to
                    // do with using jQM with Angular. Not sure!
                    window.history.back();
                    
                    setTimeout(function() {
                      debugLog('Triggering the create event...');
                      $('#profile-page-content')
                        .trigger('create');
                      setTimeout(function() {
                        $('#profile-page-content').addClass('opaque');
                      }, TIMEOUT_MS);
                    }, TIMEOUT_MS);
                    
                  }).fail(failedPromise);
              }).fail(failedPromise);
          }).fail(failedPromise);
      }).fail(failedPromise);
      
      // Hide the profile page content.
      $('#profile-page-content').addClass('transparent').removeClass('opaque');
      
      //
      // Display the Loading Widget.
      // It will be hidden when either all resources have been loaded,
      // or a load attempt fails.
      //
      $.mobile.loading('show');
      
      // Begin asynchronous loading of the profile data.
      getSCResource(
        '/users/' + uid + '.json',
        {client_id: CLIENT_ID},
        getResourceCallback.bind(defer, profile)
      );
    };
    
    $scope.playTrack = function(track_id) {
      
      if (!isInt(track_id) || track_id == 0) {
        debugLog('Invalid track ID received in playTrack method: ' + track_id);
      }
      var track = null;
      var tracks = $scope.current_profile.tracks;
      someEls(tracks, function(el, ndx, a) {
        if (el.id == track_id) {
          track = el;
          return true;
        }
        return false;
      });
      if (track === null) {
        debugLog('There is no track in the current profile with the specified ID: ' + track_id);
        return;
      }
      
      // Set the "Now Playing" track title.
      $('#track-title').text(track.title);
      
      // Set the track's artwork.
      var artwork = $('#current-track-artwork');
      debugLog(track);
      $('img', artwork).attr('src', track.artwork_url);
      
      // Open the panel, and begin streaming.
      $('#player-panel').panel('open');
      beginTrackStreaming(track_id)
        .done(function(sound) {
          AudioController.getInstance().setSoundObject(sound).play();
        })
        .fail(function(msg) {
          debugLog(msg);
          // TODO: Display a modal dialog with error message.
          // And lose the alert()!
          alert(msg);
        });
    };
    
    //
    // Initialize any cached user data in local storage.
    //
    SCUserProfileCache.getInstance().loadProfiles();
    
    //
    // Load the last/default profile.
    // selectProfile will check the cache first.
    // Attempting to load the data from the SoundCloud API
    // asynchronously only if it is not already cached.
    //
    $scope.selectProfile(last_profile_uid);
    
    ProfileCtrl._scope = $scope;
  }
  
  ProfileCtrl._scope = null;
  
  // Define a module to route the URL '/profile' to the ProfileCtrl controller
  // and profile.html template.
  // Add a directive named 'triggerCreate' which will register a pagecreate event
  // handler on the #profile page, and enhance the content with jQMu sing
  // $('.sound-cloud-profile').trigger('create') on the parent <article>
  // element of the profile template, enhancing the elements using jQM.
  angular.module('ngView', [], function($routeProvider, $locationProvider) {
  
    $routeProvider.when('/profile', {
      templateUrl: 'js/aarons-player/tpl/profile.html',
      controller: ProfileCtrl
    });
    
  });
  
  function stopEvent(e) {
    e.preventDefault();
    if (e.stopPropagation) {
      e.stopPropagation();
    } else {
      e.cancelBubble = true;
    }
  }
  
  /**
   * Callback function for failed asynchronous resource load attempts that return
   * a promise. The function logs the arguments to the debug console, hides
   * the Loading Widget, and displays a modal dialog with an error message.
   */
  function failedPromise() {
    if (arguments.length > 0) {
      debugLog(arguments);
    }
    else {
      debugLog('An asynchronous load attempt failed, but no information was provided identifying the error.');
    }
    $.mobile.loading('hide');
    
    //
    // TODO: Display modal dialog with some sort of friendly error message.
    //
  }
  
  /**
   * Facade for the Array.prototype.forEach functionality.
   * If the <code>forEach</code> method is available on the platform
   * then it is used directly. Otherwise it is mimicked using a for loop.
   * @param {Array} a
   * @param {Function} callback
   * @param {Object|undefined} context
   * @returns {Array} Returns the iterated Array (<code>a</code> argument).
   * @throws {TypeError}
   */
  function forEachEl(a, callback, /* optional */ context /* = null */) {
    if (!$.isArray(a)) {
      throw new TypeError('Cannot iterate over a non array.');
    }
    else if (!$.isFunction(callback)) {
      throw new TypeError('Cannot iterate over an array without a valid callback function.');
    }
    context = (typeof(context) === 'object' ? context : null);
    if ($.isFunction(a.forEach)) {
      a.forEach(callback, context);
    } 
    else {
      for (var i = 0, l = a.length; i < l; ++i) {
        callback.call(context, a[i], i, a);
      }
    }
    return a;
  }
  
  /**
   * Facade for the Array.prototype.some functionality.
   * If the <code>some</code> method is available on Array instances
   * in the user's platform then it is used directly. Otherwise the
   * behavior is mimicked using a for loop.
   * @param {Array} a
   * @param {Function} callback
   * @param {Object|undefined} context
   * @returns {Array} Returns the iterated Array (<code>a</code> argument).
   * @throws {TypeError}
   */
  function someEls(a, callback, /* optional */ context /* = null */) {
    if (!$.isArray(a)) {
      throw new TypeError('Cannot iterate over a non array.');
    }
    else if (!$.isFunction(callback)) {
      throw new TypeError('Cannot iterate over an array without a valid callback function.');
    }
    context = (typeof(context) === 'object' ? context : null);
    if ($.isFunction(a.some)) {
      a.some(callback, context);
    }
    else {
      for (var i = 0, l = a.lengthl; i < l; ++i) {
        if (callback.call(context, a[i], i, a) === true) {
          return a;
        }
      }
    }
    return a;
  }
  
  /**
   * Facade for retrieving the keys, or names of an object's direct properties.
   * If the <code>Object.keys</code> method is available then it is utilized.
   * Otherwise the object's properties are iterated over, and collected into an
   * Array object which is then returned.
   * @param {Object}
   * @returns {Array}
   */
  function getObjectKeys(o) {
    if ($.isFunction(Object.keys)) {
      return Object.keys(o);
    }
    var k = [];
    for (var p in o) {
      if (o.hasOwnProperty(p)) {
        k.push(p);
      }
    }
    return k;
  }
  
  /**
   * Must be called in the context of a Deferred object using the <code>bind</code> method, along with
   * the resource target object/array prepended to the argument list:
   * @example <code>var d = $.Deferred(); var cb = getResourceCallback.bind(d, this.tracks); getSCResource(url, params, cb);</code>
   * @param {Object|Array} resource_target
   * @param {Object|Array} response
   * @param {Object|undefined} error
   */
  function getResourceCallback(resource_target, response, error) {
    if (typeof(error) === 'object' && error !== null) {
      this.reject(error.errors);
    }
    else if (typeof(response) !== 'object' || response === null) {
      this.reject('An unknown error occurred attempting to retrieve a SoundCloud API resource.');
    }
    else {
      if ($.isArray(response)) {
        forEachEl(
          response, 
          function(el, ndx, a) {
            this.push(el);
          }, 
          resource_target
        );
      }
      else {
        copyObject(response, resource_target);
      }
      this.resolve(resource_target);
    }
  }
  
  /**
   * Perform a GET request to the SoundCloud API for a resource, or set of resources.
   * @param {string} url
   * @param {Object|null} params
   * @param {Function} callback
   * @returns {Boolean}
   */
  function getSCResource(url, params, callback) {
    try {
      SC.get(url, params, callback);
      return true;
    }
    catch (ex) {
      debugLog(ex.toString());
    }
    return false;
  }
  
  /**
   * Attempts to begin streaming of an audio track identified by its unique ID.
   * @param {integer} track_id
   * @returns {Promise}
   */
  function beginTrackStreaming(track_id) {
    if (!isInt(track_id) || track_id == 0) {
      debugLog('Cannot stream track with an invalid track_id: ' + track_id);
      return;
    }
    var defer = $.Deferred();
    try {
      SC.stream(
        '/tracks/' + track_id, {
          autoPlay: false,
          ontimedcomments: function(comments) {
            showTimedComments(comments);
          }
        },
        function(sound) {
          defer.resolve(sound);
        }
      ); 
    }
    catch (ex) {
      defer.reject(ex.message);
    }
    return defer.promise();
  }
  
  /**
   * Displays the array of timed track playback comments.
   * Each comment item is appended to a list which automatically
   * scrolls down with each new received comment(s).
   * @param {Array} comments
   */
  function showTimedComments(comments) {
    if (!$.isArray(comments) || comments.length === 0) {
      return;
    }
    var list_id = '#audio-comment-list';
    var img_tag = '<img/>';
    var src_attr = 'src';
    var title_attr = 'title';
    var span_tag = '<span/>';

    forEachEl(comments, function(el, ndx, a) {
      $(img_tag).attr(src_attr, el.user.avatar_url).attr(title_attr, el.user.username).appendTo(list_id);
      $(span_tag).html(el.body).appendTo(list_id);
    });
  }
  
  /**
   * @function
   * @name isInt
   * @inner
   * @description Closure encapsulating a positive integer (or zero) validating RegExp object, returning a function to test a value against the RegExp.
   * @returns {Boolean}
   */
  var isInt = (function(){
    var rx = /^\d+$/;
    return function(val) {
      try {
        return rx.test(val);
      } 
      catch (ex) {
        return false;
      }
    };
  })();

  /**
   * Copies all direct properties from src to target.
   * @param {Object} src
   * @param {Object} target
   * @returns {Object} The target object.
   * @throws {TypeError}
   */
  function copyObject(src, target) {
    if (typeof(src) !== 'object' || src === null) {
      throw new TypeError('Invalid source object for copy.');
    }
    else if (typeof(target) !== 'object' || target === null) {
      throw new TypeError('Invalid target object for copy.');
    }
    for (var p in src) {
      if (src.hasOwnProperty(p)) {
        target[p] = src[p];
      }
    }
    return target;
  }
  
  /**
   * Returns data stored in Local Storage identified by its key.
   * NULL is returned if Local Storage is not available, there
   * are no items in Local Storage, or if the provided data key
   * does not identify an existing item in the store.
   * @param {string} data_key
   * @returns {string|null}
   * @inner
   */
  function readFromLocal(data_key) {
    if (!Modernizr.localstorage) {
      return null;
    }
    var store = window.localStorage;
    if (store.length === 0) {
      return null;
    }
    return store.getItem(data_key);
  }
  
  /**
   * Read a named cookie's value.
   * @param {string} name
   * @returns {string|null}
   * @inner
   */
  function readFromCookie(name) {
    if (!Modernizr.cookies) {
      return null;
    }
    return $.cookie(name);
  }
  
  /**
   * Write a named cookie's value.
   * The value is converted to a string using the <code>toString</code> method.
   * @param {string} name
   * @param {any} value
   * @inner
   */
  function writeToCookie(name, value) {
    if (!Modernizr.cookies) {
      return;
    }
    $.cookie(name, value.toString());
  }
  
  /**
   * Logs a message to the debug console if it is available.
   * The <code>msg</code> argument is converted to a string using the <code>toString</code> method.
   * @param {string|any} msg
   * @inner
   */
  function debugLog(msg) {
    if (typeof(window.console) === 'object' && window.console !== null && $.isFunction(window.console.debug)) {
      window.console.debug(msg.toString());
    }
  }
  
  
  /**
   * Applies the <code>Object.freeze</code> method to an object if it is available
   * in the user agent's JavaScript engine (v1.8.5+), and the object is not
   * already frozen.
   * @param {Object} o Object to freeze.
   * @returns {Object} The frozen (or untouched if freeze is not available) object.
   */
  function freezeIt(o) {
    if ($.isFunction(Object.freeze) && typeof(o) === 'object' && o !== null) {
      if (!Object.isFrozen(o)) {
        Object.freeze(o);
      }
    }
    return o;
  }

  $(document).one('pageinit', '#splash', function(e) {
    var TIMEOUT_MS = 2000;
    var $logo = $('#splash-content > div');
    $logo.addClass('opaque').removeClass('transparent');
    setTimeout(function() {
      $logo.addClass('rotate-out');
      setTimeout(function() {
        $.mobile.changePage('#profile', {
          changeHash: true,
          transition: 'pop'
        });
        //$.mobile.navigate('#profile');
      }, TIMEOUT_MS);
    }, TIMEOUT_MS);
  });
  
  
  // Play/pause click event handler.
  $(document).on('vclick', '#play-pause-button', function(e) {
    stopEvent(e);
    var FADE_TIME = 100;
    var $this = $(this);
    var inner = $('> span', $this);
    var audio_ctrl = AudioController.getInstance();
    if (inner.hasClass('play-state')) {
      audio_ctrl.play();
      $this.fadeOut(FADE_TIME, function() {
        inner.removeClass('play-state').addClass('pause-state');
        $this.fadeIn(FADE_TIME);
      });
    }
    else if (inner.hasClass('pause-state')) {
      audio_ctrl.pause();
      $this.fadeOut(FADE_TIME, function() {
        inner.removeClass('pause-state').addClass('play-state');
        $this.fadeIn(FADE_TIME);
      });
    }
  });
  
  // profile selection change
  $(document).on('vclick', 'a.friend-profile-link', function(e) {
    stopEvent(e);
    ProfileCtrl._scope.selectProfile($(this).attr('data-friend-id'));
  });
  
})(jQuery);
