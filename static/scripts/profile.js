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
/*global document:true, _:true, Backbone: true, alert:true */

$(document).ready(function _ready()
{
  // change template tags to avoid conflicts with serverside templating
  _.templateSettings = {
    evaluate: /\{\{(.+?)\}\}/g,
    interpolate: /\{\{=(.+?)\}\}/g
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
      this.listenTo(this.model, 'error', this._error);
      this.render();
    },

    events: {
      'click a[class="button_disable"] ': '_disable',
      'click a[class="button_delete"] ': '_delete'
    },

    render: function render() {
      this.$el.html(this.template(this.model.toJSON()));
    },

    _disable: function _disable(event) {
      event.preventDefault();
      event.stopPropagation();
      this.model.set('active', !this.model.get('active'));
      this.model.save();
    },

    _delete: function _delete(event) {
      event.preventDefault();
      event.stopPropagation();
      this.model.destroy();
    },

    _error: function _error(model, xhr) {
      // interestingly, this also gets triggered on successful responses...
      if (xhr.status !== 200) {
        var response= JSON.parse(xhr.responseText);
        this.model.set('active', response.active);
        alert(response.error);
      }
    }
  });

  var WebIDListView = Backbone.View.extend({
    el: $('#webidlist'),

    initialize: function initialize() {
      this.listenTo(webids, 'add', this._add);
      this.listenTo(webids, 'reset', this._reset);
      this.listenTo(webids, 'all', this.render);
    },

    _add: function _add(webid) {
      var view = new WebIDView({model: webid});
      this.$el.append(view.el);
    },

    _reset: function _reset() {
      webids.each(this._add, this);
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
  webids.fetch();
});
