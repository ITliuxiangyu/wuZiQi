﻿'use strict';

(function ($, window, undefined) {
    "use strict";
    var originCellWidth = 30; //棋盘每格的宽度
    var originPieceRadius = 14; //棋子半径
    var backgroundPointWidth = 6; //背景黑点宽度
    var canvasWidth = 480; //canvas宽度
    var canvasHeight = 800; //canvas高度
    var originCheckerboardOffset = { x: 30, y: 150 }; //棋盘坐标
    var $game = $('#game');
    var $gameCanvas = $('#game-canvas');
    var $gamePanel = $('#gamePanel');
    var ratio = ($gameCanvas.width() / canvasWidth).toFixed(2);
    var cellWidth = parseInt(originCellWidth * ratio);
    var checkerboardOffset = { x: originCheckerboardOffset.x * ratio, y: originCheckerboardOffset.y * ratio };
    var pieceRadius = originPieceRadius * ratio;
    var canvas = document.getElementById('game-canvas');
    var steps = [];
    var user = lm.getCookie('game_gobang_user');
    user = user ? JSON.parse(user) : undefined;
    var onlineCount = 0;
    if (!canvas.getContext) {
        return alert('你的浏览器竟然不支持canvas！');
    }
    var ctx = canvas.getContext('2d');
    var gobang = {
        init: function init() {
            //初始化
            this._initCanvas()._initSocket()._initTools();
            $(window).resize(function () {
                $gameCanvas.height($(window).height());
                gobang._resetVars();
                $game.children('div').css({ 'transform': 'scale(' + ratio + ', ' + ratio + ')' });
            });
            return this;
        },
        beginGame: function beginGame(order) {
            //开始游戏
            steps = [];
            gobang._initCanvas();
            $gameCanvas.mousemove(function (event) {
                var e = event || window.event;
                var x = e.pageX || e.clientX;
                var y = e.pageY || e.clientY;
                var curPos = gobang._getPos(x, y);
                gobang._tryDrawPiece(curPos.x, curPos.y, user.myColor);
            });
            canvas.addEventListener("touchmove", function (e) {
                var touches = e.touches[0];
                var curPos = gobang._getPos(touches.clientX, touches.clientY);
                gobang._tryDrawPiece(curPos.x, curPos.y, user.myColor);
            }, false);
            $gameCanvas.click(function (event) {
                var e = event || window.event;
                var x = e.pageX || e.clientX;
                var y = e.pageY || e.clientY;
                var curPos = gobang._getPos(x, y);
                gobang.socket.emit('drawPiece', { roomId: user.roomId, nickname: user.nickname, x: curPos.x, y: curPos.y, color: user.myColor });
            });
            canvas.addEventListener("touchend", function (e) {
                var touches = e.changedTouches[0];
                var curPos = gobang._getPos(touches.clientX, touches.clientY);
                gobang.socket.emit('drawPiece', { roomId: user.roomId, nickname: user.nickname, x: curPos.x, y: curPos.y, color: user.myColor });
                canvas.removeEventListener("touchmove", e.preventDefault(), false);
            }, false);
            this._updateGameOrder(order);
        },
        _updateGameOrder: function _updateGameOrder(order) {
            var color = order ? 'white' : 'black';
            $('.status').empty();
            $('#' + color + ' .status').html('Go');
        },
        _initCanvas: function _initCanvas() {
            //初始化棋盘
            this._clearCanvas();
            ctx.beginPath();
            ctx.fillStyle = '#D2B094';
            ctx.font = 'bold 50px consolas';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('五子棋', 240, 70);
            this._showOnlineInfo();
            ctx.closePath();
            ctx.beginPath();
            ctx.fillStyle = '#D2B094';
            for (var i = 0; i < 14; i++) {
                //绘制棋盘
                for (var j = 0; j < 14; j++) {
                    ctx.strokeRect(j * originCellWidth + originCheckerboardOffset.x, i * originCellWidth + originCheckerboardOffset.y, originCellWidth, originCellWidth);
                    ctx.fillRect(j * originCellWidth + originCheckerboardOffset.x, i * originCellWidth + originCheckerboardOffset.y, originCellWidth, originCellWidth);
                }
            }
            ctx.fillStyle = 'black';
            ctx.fillRect(this._getCoordinate(3, 3).x - backgroundPointWidth / 2, this._getCoordinate(3, 3).y - backgroundPointWidth / 2, backgroundPointWidth, backgroundPointWidth);
            ctx.fillRect(this._getCoordinate(11, 3).x - backgroundPointWidth / 2, this._getCoordinate(11, 3).y - backgroundPointWidth / 2, backgroundPointWidth, backgroundPointWidth);
            ctx.fillRect(this._getCoordinate(7, 7).x - backgroundPointWidth / 2, this._getCoordinate(7, 7).y - backgroundPointWidth / 2, backgroundPointWidth, backgroundPointWidth);
            ctx.fillRect(this._getCoordinate(3, 12).x - backgroundPointWidth / 2, this._getCoordinate(3, 11).y - backgroundPointWidth / 2, backgroundPointWidth, backgroundPointWidth);
            ctx.fillRect(this._getCoordinate(11, 12).x - backgroundPointWidth / 2, this._getCoordinate(11, 11).y - backgroundPointWidth / 2, backgroundPointWidth, backgroundPointWidth);
            ctx.fill();
            return this;
        },
        _initTools: function _initTools() {
            $game.children('div').css({ 'transform': 'scale(' + ratio + ', ' + ratio + ')' });
            var $entrance = $('#entrance');
            var $menu = $('#menu');
            var $rooms = $('#rooms');
            if (user) {
                $entrance.find('#nickinput').val(user.nickname).hide();
            }
            $entrance.show().find('#play').click(function () {
                var nickname = $.trim($('#nickinput').val());
                if (!nickname) return gobang.notice('请输入昵称');
                gobang.socket.emit('login', { nickname: nickname });
            });
            $menu.find('#showRooms').click(function () {
                if ($rooms.is(':hidden')) {
                    gobang.socket.emit('roomsInfo', user);
                    $rooms.slideDown('fast');
                } else {
                    $rooms.slideUp('fast');
                }
            });
            $rooms.find('#closeRooms').click(function () {
                $rooms.slideUp('fast');
            });
            $('#game-canvas').click(function () {
                $rooms.slideUp('fast');
            });
            $('#createRoom').click(function () {
                var roomName = prompt('请输入房间名（20个字符内）', '不要走，决战到天亮!');
                roomName = lm.htmlEncode($.trim(roomName));
                if (roomName) {
                    gobang.socket.emit('createRoom', { nickname: user.nickname, roomName: roomName, roomId: user.roomId });
                }
            });
            $(document).on('click', '.exitRoom', function () {
                if (confirm('确定退出房间吗？')) {
                    gobang.socket.emit('exitRoom', { roomId: $(this).attr('roomid'), nickname: user.nickname });
                }
            });
            $(document).on('click', '#readyBtn', function () {
                gobang.socket.emit('ready', { roomId: $(this).attr('roomid'), nickname: user.nickname });
            });
            $(document).on('click', '.joinRoom', function () {
                gobang.socket.emit('joinRoom', { roomId: $(this).attr('roomid'), nickname: user.nickname });
            });
            return this;
        },
        _showOnlineInfo: function _showOnlineInfo() {
            ctx.beginPath();
            ctx.font = '14px consolas';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'left';
            if (user && user.nickname) {
                ctx.fillText('用户：' + user.nickname, 20, 10);
            }
            ctx.fillText('当前在线人数：' + onlineCount, 20, 30);
            ctx.closePath();
        },
        _initSocket: function _initSocket() {
            this.socket = io.connect('https://game-api.liangmin.wang');
            this.socket.on('drawPiece', function (r) {
                if (r.err) {
                    return gobang.notice(r.err);
                }
                gobang.drawPiece(r.x, r.y, r.myColor);
                gobang._updateGameOrder(r.order);
            });
            this.socket.on('win', function (r) {
                $('.status').html('');
                if (r.color) {
                    $('#white .status').html('Win');
                    gobang.notice('白棋胜！');
                } else {
                    $('#black .status').html('Win');
                    gobang.notice('黑棋胜！');
                }
                gobang._unBindEvent();
                $('.exitRoomInGame').remove();
                $('<div id="readyBtn" roomid="' + user.roomId + '">Ready</div>').appendTo($gamePanel);
            });
            this.socket.on('login', function (r) {
                if (r.err) {
                    return gobang.notice(r.err);
                }
                user = r.user;
                lm.setCookie('game_gobang_user', JSON.stringify(user));
                $('#entrance').remove();
                $('#showRooms').show();
            });
            this.socket.on('onlineInfo', function (r) {
                onlineCount = r.onlineCount;
                gobang.refreshCanvas(steps);
            });
            this.socket.on('notice', function (r) {
                gobang.notice(r.msg);
            });
            this.socket.on('createRoom', function (r) {
                if (r.err) {
                    return gobang.notice(r.err);
                }
                user.myColor = r.myColor ? 1 : 0;
                gobang._updateGamePanel(r);
                gobang.socket.emit('roomsInfo');
            });
            this.socket.on('ready', function (r) {
                if (r.err) {
                    return gobang.notice(r.err);
                }
                if (r.nickname === user.nickname) {
                    $('.status').eq(0).text('Ready');
                    $('#readyBtn').remove();
                    $('<div class="exitRoom exitRoomInGame" roomid="' + user.roomId + '">退出房间</div>').appendTo($gamePanel);
                } else {
                    $('.status').eq(1).text('Ready');
                }
            });
            this.socket.on('beginGame', function (r) {
                gobang.notice('开始！' + (r.order ? '白棋先手' : '黑棋先手'));
                gobang.beginGame(r.order);
            });
            this.socket.on('joinRoom', function (r) {
                if (r.err) {
                    return gobang.notice(r.err);
                }
                user.myColor = r.myColor ? 1 : 0;
                gobang._updateGamePanel(r);
                gobang.socket.emit('roomsInfo');
            });
            this.socket.on('exitRoom', function (r) {
                if (r.err) {
                    return gobang.notice(r.err);
                }
                gobang._unBindEvent();
                if (r.myColor !== undefined) {
                    //别人退出
                    gobang._updateGamePanel(r);
                } else {
                    //自己退出
                    delete user.roomId;
                    delete user.myColor;
                    $('#gamePanel').hide();
                }
                gobang.socket.emit('roomsInfo');
            });
            this.socket.on('roomsInfo', function (r) {
                $('.room').remove();
                var othersRooms = '';
                var selfRoom = '';
                for (var i in r.rooms) {
                    var flag = false;
                    var html = '';
                    html += '<div class="room">';
                    html += '<p><span>No.' + i + '</span><span>房间名：' + r.rooms[i].roomName + '</span></p>';
                    html += '<div class="room-users">';
                    if (r.rooms[i].players.black) {
                        html += '<div class="blackUser room-user"><div></div><span>' + r.rooms[i].players.black.nickname + '</span></div>';
                    }
                    if (r.rooms[i].players.white) {
                        html += '<div class="whiteUser room-user"><div></div><span>' + r.rooms[i].players.white.nickname + '</span></div>';
                    }
                    html += '</div>';
                    if (user.roomId == i) {
                        flag = true;
                        html += '<div class="room-status exitRoom exitRoomBtn" roomid="' + i + '">退出</div>';
                    } else if (!user.roomId && r.rooms[i].status == 0) {
                        html += '<div class="room-status joinRoom" roomid="' + i + '">加入房间</div>';
                    } else if (r.rooms[i].status == 1) {
                        html += '<div class="room-status" style="background: #D2B094; color: yellow; box-shadow: none;">准备中...</div>';
                    } else if (r.rooms[i].status == 2) {
                        html += '<div class="room-status" style="background: #D2B094; color: red; box-shadow: none;">游戏中...</div>';
                    }
                    html += '</div>';
                    if (flag) {
                        selfRoom = html;
                    } else {
                        othersRooms += html;
                    }
                }
                $('#roomsWrap').html(selfRoom + othersRooms);
            });
            return this;
        },
        _unBindEvent: function _unBindEvent() {
            $gameCanvas.unbind('mousemove');
            $gameCanvas.unbind('click');
            canvas.removeEventListener("touchmove", function () {}, false);
            canvas.removeEventListener("touchend", function () {}, false);
        },
        _updateGamePanel: function _updateGamePanel(r) {
            user.roomId = r.roomId;
            $('#rooms').hide();
            $gamePanel.empty().show();
            var html = '';
            html += '<div class="player" id="' + (r.myColor ? "white" : "black") + '">';
            html += '    <div class="playerInfo">';
            html += '        <div class="' + (r.myColor ? "whiteCircle" : "blackCircle") + ' circle"></div>';
            html += '        <div class="nickname">' + user.nickname + '</div>';
            html += '    </div>';
            html += '    <div class="status">' + (r.myStatus ? 'Ready' : '') + '</div>';
            html += '</div>';
            html += '<div class="player" id="' + (!r.myColor ? "white" : "black") + '">';
            html += '    <div class="playerInfo">';
            html += '        <div class="' + (r.player ? !r.myColor ? "whiteCircle" : "blackCircle" : "") + ' circle"></div>';
            html += '        <div class="nickname">' + (r.player ? r.player.nickname : "") + '</div>';
            html += '    </div>';
            html += '    <div class="status">' + (r.player ? r.player.status ? 'Ready' : '' : "waiting...") + '</div>';
            html += '</div>';
            $gamePanel.append(html);
            if (r.myStatus) {
                $('<div class="exitRoom exitRoomInGame" roomid="' + user.roomId + '">退出房间</div>').appendTo($gamePanel);
            } else {
                $('<div id="readyBtn" roomid="' + r.roomId + '">Ready</div>').appendTo($gamePanel);
            }
        },
        refreshCanvas: function refreshCanvas(steps) {
            //重绘棋盘
            this._initCanvas();
            for (var i = 0; i < steps.length; i++) {
                var coordinate = this._getCoordinate(steps[i].x, steps[i].y);
                ctx.beginPath();
                ctx.arc(coordinate.x, coordinate.y, originPieceRadius, 0, Math.PI * 2);
                ctx.fillStyle = steps[i].color === 0 ? 'black' : 'white';
                ctx.fill();
            }
        },
        _getCoordinate: function _getCoordinate(x, y) {
            //根据棋子坐标获得相对背景的位置(未缩放)
            return { x: originCellWidth * x + originCheckerboardOffset.x - 0.5, y: originCellWidth * y + originCheckerboardOffset.y - 0.5 };
        },
        _tryDrawPiece: function _tryDrawPiece(x, y, color) {
            //预览棋子 color 0: 黑子 1：白子
            this.refreshCanvas(steps);
            if (x < 0 || y < 0) return;
            var coordinate = this._getCoordinate(x, y);
            if (color === 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            }
            ctx.beginPath();
            ctx.arc(coordinate.x, coordinate.y, originPieceRadius, 0, Math.PI * 2);
            ctx.fill();
        },
        drawPiece: function drawPiece(x, y, color) {
            //落子 color 0: 黑子 1：白子
            if (x < 0 || y < 0) return;
            steps.push({ x: x, y: y, color: color });
            this.refreshCanvas(steps);
        },
        _getPos: function _getPos(x, y) {
            //根据鼠标位置获得棋子坐标
            var curPos = this._windowToCheckerboardPos(x, y);
            x = Math.round(curPos.x / cellWidth);
            y = Math.round(curPos.y / cellWidth);
            return x > 14 || x < 0 || y > 14 || y < 0 ? { x: -1, y: -1 } : { x: x, y: y };
        },
        _windowToCanvasPos: function _windowToCanvasPos(x, y) {
            //相对视窗坐标转化为相对canvas坐标
            return { x: parseInt(x - canvas.offsetLeft), y: parseInt(y - canvas.offsetTop) };
        },
        _canvasToCheckerboardPos: function _canvasToCheckerboardPos(x, y) {
            //相对canvas坐标转化为相对棋盘的坐标
            return { x: parseInt(x - checkerboardOffset.x), y: parseInt(y - checkerboardOffset.y) };
        },
        _windowToCheckerboardPos: function _windowToCheckerboardPos(x, y) {
            //相对视窗坐标直接转化为相对棋盘坐标
            var windowToCanvasPos = this._windowToCanvasPos(x, y);
            var canvasToCheckerboardPos = this._canvasToCheckerboardPos(windowToCanvasPos.x, windowToCanvasPos.y);
            return { x: canvasToCheckerboardPos.x, y: canvasToCheckerboardPos.y };
        },
        _resetVars: function _resetVars() {
            //缩放后重置变量
            ratio = ($gameCanvas.width() / canvasWidth).toFixed(2);
            cellWidth = parseInt(originCellWidth * ratio);
            checkerboardOffset = { x: originCheckerboardOffset.x * ratio, y: originCheckerboardOffset.y * ratio };
            pieceRadius = originPieceRadius * ratio;
        },
        _clearCanvas: function _clearCanvas() {
            //清空画布
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        },
        notice: function notice(msg) {
            //系统提示
            var $notice = $('#notice');
            $notice.html(msg).slideDown(function () {
                setTimeout(function () {
                    $notice.slideUp();
                }, 1500);
            });
        }
    };
    //var overScroll = function(el) {
    //    el.addEventListener('touchstart', function() {
    //        var top = el.scrollTop
    //            , totalScroll = el.scrollHeight
    //            , currentScroll = top + el.offsetHeight;
    //        if(top === 0) {
    //            el.scrollTop = 1;
    //        } else if(currentScroll === totalScroll) {
    //            el.scrollTop = top - 1;
    //        }
    //    });
    //    el.addEventListener('touchmove', function(evt) {
    //        if(el.offsetHeight < el.scrollHeight)
    //            evt._isScroller = true;
    //    });
    //};
    //if (document.querySelector('.scroll')) {
    //    overScroll(document.querySelector('.scroll'));
    //}
    //document.body.addEventListener('touchmove', function(evt) {
    //    if(!evt._isScroller) {
    //        evt.preventDefault();
    //    }
    //});
    gobang.init();
    window.onbeforeunload = function (event) {
        return "您的游戏进度将丢失，确定离开此页面吗？";
    };
})(jQuery, window);