(function () {
  var postsPerPage = 10;
  var socket;
  var postPanel, postTemplates;
  var notificationTemplates;

  function formatDateTime (timestamp) {
    var date = new Date(timestamp);
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
      + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
  }

  function loadTemplate (element, name) {
    if (!(element instanceof jQuery)) {
      element = $(element);
    }
    var template = element.find('[data-template-type=' + name + ']');
    if (template.length == 0) {
      return '';
    }
    var html = template.removeAttr('data-template-type').clone()
      .wrap('<div />').parent().html();
    template.remove();
    return html;
  }

  function renderPost (post, method) {
    post.time = formatDateTime(post.timestamp);
    var item = Mustache.render(postTemplates[post.type], post);
    item = $(item);
    item.data('post-id', post._id);
    if (method == 'append') {
      postPanel.append(item).masonry('appended', item);
    } else if (method == 'prepend') {
      postPanel.prepend(item).masonry('prepended', item);
    }
  }

  function initializeNotificationPanel () {
    var panel = $('#notification-panel');
    notificationTemplates = {
      error: loadTemplate(panel, 'error'),
      success: loadTemplate(panel, 'success')
    };
  }

  function initializePostPanel () {
    postPanel = $('#post-panel');
    postTemplates = {
      message: loadTemplate(postPanel, 'message')
    };
    postPanel.masonry({
      itemSelector: '.post-item',
      columnWidth: '.post-item-sizer'
    });
  }

  function initializeNewPostPanel () {
    $('#new-post-btn').click(function (event) {
      var box = $('#message-input');
      var text = box.val().trim();
      if (text) {
        socket.emit('post', { type: 'message', content: text });
        box.val('');
      }
    });
  }

  function showNotification (message) {
    var item = Mustache.render(notificationTemplates[message.type], message);
    item = $(item);
    $('#notification-panel').append(item);
  }

  function initializeSocket () {
    socket = io.connect('/');
    socket.on('get-post', function (data) {
      for (var i = 0; i < data.length; i++) {
        renderPost(data[i], 'append');
      }
    });
    socket.on('post', function (data) {
      renderPost(data, 'prepend');
    });
    socket.on('post:ok', function () {
      showNotification({ type: 'success', title: '', content: 'post published' });
    });
    socket.on('post:err', function (data) {
      if (data.err == 'unauthorized') {
        showNotification({ type: 'error', title: 'Failed', content: 'unauthorized' });
      } else {
        showNotification({ type: 'error', title: 'Failed', content: 'unknown error' });
      }
    });
  }

  function initializeDynamicPostLoading () {
    $(window).scroll(function () {
      var delta = $(window).scrollTop() + $(window).height() - $(document).height();
      delta += $('#footer').height();
      if (delta >= 0) {
        var earliest = postPanel.find('.post-item:last-child');
        if (earliest.length > 0) {
          var id = earliest.data('post-id');
          getPosts(id, postsPerPage);
        }
      }
    });
  }

  function getPosts (maxId, limit) {
    socket.emit('get-post', { max_id: maxId, limit: limit });
  }

  $(document).ready(function () {
    initializeNotificationPanel();
    initializePostPanel();
    initializeNewPostPanel();
    initializeSocket();
    initializeDynamicPostLoading();
    getPosts(null, postsPerPage);
  });

})();