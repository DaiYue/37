(function () {
  var postsPerPage = 10;
  var socket;
  var postPanel, postTemplates;
  var notificationTemplates;
  var hasMorePosts = true;
  var isLoadingPosts = false;
  var uploadState = 'idle';

  function formatDateTime (timestamp) {
    var t = new Date(timestamp);
    var y = t.getFullYear();
    var o = t.getMonth() + 1;
    var d = t.getDate();
    var h = t.getHours();
    var m = t.getMinutes();
    var s = t.getSeconds();
    return y + '/' + (o < 10 ? '0' + o : o) + '/' + (d < 10 ? '0' + d : d) + ' ' +
      (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function formatFileSize (bytes) {
    var units = ['B', 'kB', 'MB', 'GB', 'TB'];
    if (bytes == 0) {
      return '0 B';
    }
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + units[i];
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
    var template = postTemplates[post.type];
    if (!template) {
      return;
    }
    post.time = formatDateTime(post.timestamp);
    var item = Mustache.render(template, post);
    item = $(item);
    item.data('post-id', post._id);
    var avatar = item.find('.avatar img');
    avatar.attr('src', avatar.data('src'));
    if (method == 'append') {
      postPanel.append(item).masonry('appended', item);
    } else if (method == 'prepend') {
      postPanel.prepend(item).masonry('prepended', item);
    }
    if (post.type == 'picture') {
      var wrapper = item.find('.picture-wrapper');
      var picture = wrapper.find('img');
      picture.attr('src', picture.data('src'));
      wrapper.imagesLoaded(function () {
        // hide picture until loaded to prevent post overlap
        picture.removeClass('hidden');
        wrapper.find('.loading').addClass('hidden');
        postPanel.masonry('layout');
      });
    }
    else if (post.type == 'video') {
      var wrapper = item.find('.video-wrapper');
      var video = wrapper.find('video');
      var source = video.find('source');
      source.attr('src', video.data('src'));
      video.bind('loadedmetadata', function () {
        postPanel.masonry('layout');
      });
    }
  }

  function showInvitation () {
    var item = Mustache.render(postTemplates['invitation'], {});
    item = $(item);
    item.find('img.invitation').attr('src', '/invitation');
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
      picture: loadTemplate(postPanel, 'picture'),
      video: loadTemplate(postPanel, 'video'),
      invitation: loadTemplate(postPanel, 'invitation')
    };
    postPanel.masonry({
      itemSelector: '.post-item',
      columnWidth: '.post-item-sizer'
    });
  }

  function changeFileUploadState (state, data) {
    var panel = $('#new-message');
    if (state == 'idle') {
      panel.find('.progress, .cancel-button, .delete-button, .upload-result').addClass('hidden');
      panel.find('.upload-button').removeClass('hidden');
      panel.data('file-uploaded', null);
    } else if (state == 'uploading') {
      panel.find('.upload-button, .delete-button, .upload-result').addClass('hidden');
      panel.find('.progress').removeClass('hidden');
      panel.find('.cancel-button').removeClass('hidden')
        .on('click', function () {
          $(this).off('click');
          data.abort();
        });
    } else if (state == 'uploaded') {
      panel.find('.progress, .upload-button, .cancel-button').addClass('hidden');
      panel.find('.delete-button').removeClass('hidden')
        .on('click', function () {
          $(this).off('click');
          changeFileUploadState('idle', data);
        });
      panel.find('.upload-result').removeClass('hidden');
      panel.find('.upload-result .file-name a').text(data.files[0].name)
        .attr('href', data.result.url);
      panel.find('.upload-result .file-size').text(
        '(' + formatFileSize(data.files[0].size) + ')');
      panel.data('file-uploaded', data);
    }
    uploadState = state;
    updateMessageButtonState();
  }

  function updateMessageButtonState () {
    var text = $.trim($('#message-input').val());
    var data = $('#new-message').data('file-uploaded');
    var hasText = text.length > 0;
    var fileUploaded = data && data.result;
    var button = $('#new-message-btn');
    if (uploadState == 'uploading') {
      button.prop('disabled', true);
    } else if (!hasText && !fileUploaded) {
      button.prop('disabled', true);
    } else {
      button.prop('disabled', false);
    }
  }

  function setFileUploadProgress (progress) {
    var bar = $('#new-message .progress-bar');
    bar.css('width', progress + '%').attr('aria-valuenow', progress);
    bar.find('.sr-only').text(progress + '%');
  }

  function initializeNewPostPanel () {
    $('#message-input').on('input propertychange', function () {
      updateMessageButtonState();
    });
    $('#new-message-btn').click(function (event) {
      if (uploadState == 'uploading') {
        return;
      }
      var box = $('#message-input');
      var text = $.trim(box.val());
      var data = $('#new-message').data('file-uploaded');
      if (!data || !data.result) {
        if (text) {
          socket.emit('post', { type: 'message', content: text });
        }
      } else {
        var mediaType = data.files[0].type;
        var post = {
          description: text,
          url: data.result.url,
          mime: mediaType
        };
        if (/image\//.test(mediaType)) {
          post.type = 'picture';
          socket.emit('post', post);
        } else if (/video\//.test(mediaType)) {
          post.type = 'video';
          socket.emit('post', post);
        }
      }
      if (text) {
        box.val('').trigger('propertychange');
      }
      changeFileUploadState('idle', data);
    });
    $('#wish-input').on('input propertychange', function () {
      if ($.trim($('#wish-input').val()).length == 0) {
        $('#new-wish-btn').prop('disabled', true);
      } else {
        $('#new-wish-btn').prop('disabled', false);
      }
    });
    $('#new-wish-btn').click(function (event) {
      var box = $('#wish-input');
      var text = $.trim(box.val());
      var secret = $('#secret-wish-checkbox').is(':checked');
      if (text) {
        socket.emit('post', { type: 'wish', content: text, secret: secret });
        box.val('').trigger('propertychange');
      }
    });
    if (!$.support.fileInput) {
      $('#new-message .upload-form').css('display', 'none');
      $('#new-message .no-file-input').removeClass('hidden');
    }
    $('#media-content-upload').fileupload({
      url: '/upload',
      dataType: 'json',
      autoUpload: false,
      acceptFileTypes: /(\.|\/)(gif|jpe?g|png|mov|mp4|mpeg|avi)$/i,
      disableImageResize: /Android(?!.*Chrome)|Opera/.test(window.navigator.userAgent),
      imageMaxWidth: 1920,
      imageMaxHeight: 1080,
      disableImageMetaDataSave: true,
      imageOrientation: true,
      maxFileSize: 5242880 // 5 MB
    })
    .prop('disabled', !$.support.fileInput)
    .on('fileuploadadd', function (e, data) {
      changeFileUploadState('uploading', data);
      setFileUploadProgress(0);
    })
    .on('fileuploadprocessalways', function (e, data) {
      if (data.files.error) {
        showNotification({ type: 'error', title: '上传失败', content: '无法读取所选文件。' });
        changeFileUploadState('idle', data);
        return;
      }
      data.submit();
    })
    .on('fileuploaddone', function (e, data) {
      changeFileUploadState('uploaded', data);
    })
    .on('fileuploadfail', function (e, data) {
      if (data.textStatus != 'abort') {
        showNotification({ type: 'error', title: '上传失败', content: '未知错误。' });
      }
      changeFileUploadState('idle', data);
    })
    .on('fileuploadprogressall', function (e, data) {
      var progress = parseInt(data.loaded / data.total * 100, 10);
      setFileUploadProgress(progress);
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
      receivePosts(data);
    });
    socket.on('post', function (data) {
      if (!data.secret) {
        renderPost(data, 'prepend');
      }
      var email = $(document.body).data('user-email');
      if (data.type == 'wish' && data.user && 
        data.user.gender == 'female' && data.user.email == email) {
        var deadline = new Date(2014, 3 - 1, 7).getTime();
        if (data.timestamp < deadline) {
          showInvitation();
        }
      }
    });
    socket.on('post:ok', function () {
      showNotification({ type: 'success', title: '', content: '发送成功！' });
    });
    socket.on('post:err', function (data) {
      if (data.err == 'unauthorized') {
        showNotification({ type: 'error', title: '发送失败', content: '您没有发布内容的权限！' });
      } else {
        showNotification({ type: 'error', title: '发送失败', content: '未知错误。' });
      }
    });
    socket.on('get-post:err', function (data) {
      showNotification({ type: 'error', title: '获取内容失败', content: '未知错误。' });
    });
  }

  function initializeDynamicPostLoading () {
    $(window).scroll(function () {
      if (isLoadingPosts || !hasMorePosts) {
        return;
      }
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
    isLoadingPosts = true;
    $('#post-loading-panel').removeClass('hidden');
  }

  function receivePosts (data) {
    if (data.length == 0) {
      hasMorePosts = false;
    }
    for (var i = 0; i < data.length; i++) {
      renderPost(data[i], 'append');
    }
    isLoadingPosts = false;
    $('#post-loading-panel').addClass('hidden');
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
