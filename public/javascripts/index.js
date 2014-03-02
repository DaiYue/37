(function () {
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

  $(document).ready(function () {
    var panel = $('#post-panel');
    var templates = {
      message: loadTemplate(panel, 'message')
    };
    panel.masonry({
      itemSelector: '.post-item',
      columnWidth: '.post-item-sizer'
    });

    var messages = [
      '子曰：“学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？”',
      '有子曰：“其为人也孝弟，而好犯上者，鲜矣；不好犯上，而好作乱者，未之有也。君子务本，本立而道生。孝弟也者，其为仁之本与！”',
      '子曰：“巧言令色，鲜矣仁！”',
      '曾子曰：“吾日三省吾身：为人谋而不忠乎？与朋友交而不信乎？传不习乎？”',
      '子曰：“道千乘之国，敬事而信，节用而爱人，使民以时。”',
      '子曰：“弟子，入则孝，出则悌，谨而信，泛爱众，而亲仁。行有馀力，则以学文。”'
    ];
    for (var i = 0; i < messages.length; i++) {
      var post = {
        type: 'message',
        content: messages[i],
        user: { name: '路人甲', email: 'user@gmail.com' },
        time: '2014-03-07 12:00'
      };
      var item = Mustache.render(templates[post.type], post);
      item = $(item);
      panel.append(item).masonry('appended', item);
    }
  });
})();