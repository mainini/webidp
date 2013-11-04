//$(document).ready(function ()
//{

  var WebID = Backbone.Model.extend({});

  var WebIDCollection = Backbone.Collection.extend({
    url: '/api/webids',
    model: WebID
  });

  WebIDView = Backbone.View.extend({
    el: $('#webidview'),

  initialize: function() {
    this.listenTo(this.model, "change", this.render);
  },
//    initialize: function () {
//      this.listenTo(this.webids, 'change', this.render);
//    },

    render: function () {
//      this.$el.html(this.template(this.model.attributes));
      console.log('Foo: ' + this.webids.length);
      return this;
    }
  });

  var NavigationRouter = Backbone.Router.extend({
    initialize: function (options) {
      this.webids = new WebIDCollection();

      this.view = new WebIDView({ model: this.webids });
      this.listenTo(this.webids, 'change', function () { console.log('ficken') } );
      this.view.listenTo(this.webids, 'change', this.view.render);

//      this.webids.reset($('body').data('webids'));
      this.webids.fetch({ reset: true, 
                          success: function fetchSuccess(collection, response, options) { console.log('success: ' + JSON.stringify(collection)); },
                          error: function fetchError(collection, response, options) { console.log('error!'); }, silent:false });
      console.log('LENGTH: ' + this.webids.length);
    }
  });

  var router = new NavigationRouter();
  Backbone.history.start();
//});
