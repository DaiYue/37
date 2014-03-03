(function () {
  var postsPerPage = 10;
  var socket;
  var postPanel, postTemplates;
  var notificationTemplates;

  function formatDateTime (timestamp) {
    var t = new Date(timestamp);
    var y = t.getFullYear();
    var o = t.getMonth() + 1;
    var d = t.getDate();
    var h = t.getHours();
    var m = t.getMinutes();
    var s = t.getSeconds();
    return y + '/' + (o < 10 ? '0' + o : o) + '/' + d + ' ' +
      (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
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
    var avatar = item.find('.avatar img');
    avatar.attr('src', avatar.data('src'));
    if (method == 'append') {
      postPanel.append(item).masonry('appended', item);
    } else if (method == 'prepend') {
      postPanel.prepend(item).masonry('prepended', item);
    }
  }

  function showInvitation () {
    var item = Mustache.render(postTemplates['invitation'], {});
    item = $(item);
    postPanel.prepend(item);
    item.imagesLoaded(function () {
      postPanel.masonry('prepended', item);
    });
  }

  function initializeNotificationPanel () {
    var panel = $('#notification-panel');
    notificationTemplates = {
      error: loadTemplate(panel, 'error'),
      success: loadTemplate(panel, 'success')
    };
  }

  function initializeSignInPanel () {
    var link = $('#sign-in-panel a.btn');
    link.click(function (event) {
      link.bind('click', false);
      link.find('span.loading').show();
      link.find('span.loading.icon-spin').css('display', 'inline-block');
      link.find('span.text').hide();
    });
  }

  function initializePostPanel () {
    postPanel = $('#post-panel');
    postTemplates = {
      message: loadTemplate(postPanel, 'message'),
      wish: loadTemplate(postPanel, 'wish'),
      invitation: loadTemplate(postPanel, 'invitation')
    };
    postPanel.masonry({
      itemSelector: '.post-item',
      columnWidth: '.post-item-sizer'
    });
  }

  function initializeNewPostPanel () {
    $('#new-message-btn').click(function (event) {
      var box = $('#message-input');
      var text = box.val().trim();
      if (text) {
        socket.emit('post', { type: 'message', content: text });
        box.val('');
      }
    });
    $('#new-wish-btn').click(function (event) {
      var box = $('#wish-input');
      var text = box.val().trim();
      var secret = $('#secret-wish-checkbox').is(':checked');
      if (text) {
        socket.emit('post', { type: 'wish', content: text, secret: secret });
        box.val('');
      }
    });
  }

  function showNotification (message) {
    var item = Mustache.render(notificationTemplates[message.type], message);
    item = $(item);
    $('#notification-panel').append(item);
    window.setTimeout(function () {
      item.fadeTo(500, 0).slideUp(500, function () {
        $(this).remove();
      });
    }, 3000);
  }

  function initializeSocket () {
    socket = io.connect('/');
    socket.on('get-post', function (data) {
      for (var i = 0; i < data.length; i++) {
        renderPost(data[i], 'append');
      }
    });
    socket.on('post', function (data) {
      if (!data.secret) {
        renderPost(data, 'prepend');
      }
      var email = $(document.body).data('user-email');
      if (data.type == 'wish' && data.user && 
        data.user.gender == 'male' && data.user.email == email) {
        showInvitation();
      }
    });
    socket.on('post:ok', function () {
      showNotification({ type: 'success', title: '', content: '发送成功！' });
    });
    socket.on('post:err', function (data) {
      if (data.err == 'unauthorized') {
        showNotification({ type: 'error', title: '发送失败', content: '您没有发布消息的权限！' });
      } else {
        showNotification({ type: 'error', title: '发送失败', content: '未知错误。' });
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
    initializeSignInPanel();
    initializePostPanel();
    initializeNewPostPanel();
    initializeSocket();
    initializeDynamicPostLoading();
    getPosts(null, postsPerPage);
  });

})();
