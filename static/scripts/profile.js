/**
 * @file Clientside scripting for managing a user's profile
 * @copyright 2013 Berne University of Applied Sciences (BUAS) -- {@link http://bfh.ch}
 * @author Pascal Mainini <pascal.mainini@bfh.ch>
 * @version 0.0.5
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
/*global document:true, _:true, Backbone: true, alert:true, confirm:true */

$(document).ready(function _ready()
{
  // change template tags to avoid conflicts with serverside templating
  _.templateSettings = {
    evaluate: /\{\{(.+?)\}\}/g,
    interpolate: /\{\{=(.+?)\}\}/g
  };

  var _error = function _error(model, xhr) {
    var response= JSON.parse(xhr.responseText);
    alert(response.error);
    webids.fetch({ error: _error });
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

      if (!this.model.get('active')) {
        this.model.set('active', true);
        this.model.save(null, { error: _error });
      } else if (this._disablePrompt(this.model.get('login'))) {
        this.model.set('active', !this.model.get('active'));
        this.model.save(null, { error: _error });
      }
    },

    _delete: function _delete(event) {
      event.preventDefault();
      event.stopPropagation();

      if (this._deletePrompt(this.model.get('login'), this.model.get('active'))) {
        this.model.destroy({ error: _error });
      }
    },

    _disablePrompt: function _disablePrompt(login) {
      if (webids.where({active:true}).length === 1) {
        return confirm('Really deactivate ALL WebIDs?\n(Login not possible anymore without generating a new WebID)');
      } else {
        if (login) {
          return confirm('Really deactivate the WebID you are currently logged in with?\n(Login only possible with an other active WebID afterwards)');
        }
        return true;
      }
    },

    _deletePrompt: function _deletePrompt(login, active) {
      if (webids.where({active:true}).length === 1 && active) {
        return confirm('Really delete the last active WebID?\n(Login not possible anymore without generating a new WebID)');
      } else if (webids.length === 1) {
        return confirm('Really delete the last WebID?\n(Login not possible anymore without generating a new WebID)');
      } else {
        if (login) {
          return confirm('Really delete the WebID you are currently logged in with?\n(Login only possible with an other active WebID afterwards)');
        } else {
          return confirm('Really delete this WebID?');
        }
        return true;
      }
    },

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
  webids.fetch({ error: _error });
});
