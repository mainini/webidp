/*jshint jquery:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */
/*global document:true, Backbone:true */

$(document).ready(function readyFunction () {

  var Router = Backbone.Router.extend({
    routes: {
      'createid': 'createID',
      'step2': 'step2',
      '*action': 'defaultRoute'
    },

    createID: function createID()
    {
      $(document).attr('title', 'Create WebID');
      $('#content').empty();
      $('#content').append('<h4>Create your WebID</h4>');
    },

    step2: function step2()
    {
      $(document).attr('title', 'Step 2');
      $('#content').empty();
      $('#content').append('<h4>Step 2...</h4>');
    },

    defaultRoute: function defaultRoute(action)
    {
      $(document).attr('title', 'Welcome!');
      $('#content').empty();
      $('#content').append('<h4>Welcome to the WebID identity provider!</h4>');
    }

  });

  var router = new Router();
  Backbone.history.start({root: '/'});
});
