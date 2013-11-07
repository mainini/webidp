/**
 * @file Clientside scripting for managing a user's profile
 * @copyright 2013 Berne University of Applied Sciences (BUAS) -- {@link http://bfh.ch}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.3
 *
 * ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING !
 *
 * THIS FILE HAS NO DEFINITIVE LICENSING INFORMATION.
 * LICENSE IS SUBJECT OF CHANGE ANYTIME SOON - DO NOT DISTRIBUTE!
 *
 * ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING ! WARNING !
 *
 * Based on 
 * - http://documentcloud.github.io/backbone/docs/todos.html 
 * - https://github.com/tastejs/todomvc/blob/gh-pages/architecture-examples/backbone/index.html
 *
 */

/*jshint jquery:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */
/*global document:true, _:true, Backbone: true */

$(document).ready(function readyFunction()
{
  // change template tags to avoid conflicts with serverside templating
  _.templateSettings = {
    interpolate: /\{\{(.+?)\}\}/g
  };

//////////////////// models and collections

  var WebID = Backbone.Model.extend({});

  var WebIDList = Backbone.Collection.extend({
    model: WebID,
    url: '/api/webids'
  });

  var webids = new WebIDList();


//////////////////// views

  var WebIDView = Backbone.View.extend({
    tagName: 'li',

    template: _.template($('#webid-template').html()),

    initialize: function initialize() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
      this.render();
    },

    render: function render() {
      this.$el.html(this.template(this.model.toJSON()));
    }
  });

  var WebIDListView = Backbone.View.extend({
    el: $('#webidlist'),

    initialize: function initialize() {
      this.listenTo(webids, 'add', this.addOne);
      this.listenTo(webids, 'reset', this.addAll);
      this.listenTo(webids, 'all', this.render);
    },

    addOne: function addOne(webid) {
      var view = new WebIDView({model: webid});
      this.$el.append(view.el);
    },

    addAll: function addAll() {
      webids.each(this.addOne, this);
    },

    render: function render() {
      if (webids.length) {
        this.$el.show();
      } else {
        this.$el.hide();
      }
    }

  });

  var listView = new WebIDListView();
  
//////////////////// Routing

/*  var NavigationRouter = Backbone.Router.extend({
    initialize: function initialize(options) {
    }
  });

  var router = new NavigationRouter();
  Backbone.history.start(); */

  webids.reset($('body').data('webids'));   // populate initially by data written to the template and binded to the body-element...
});
