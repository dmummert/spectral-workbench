Fred = {
	click_radius: 6,
	height: '100%',
	width: '100%',
	layers: [],
	tools: [],
	frame: 0,
	timestamp: 0,
	date: new Date,
	times: [],
	drag: false,
	init: function(args) {
		Fred.element = $('fred')
		Fred.select_tool('pen')
		new Fred.Layer('main',{active:true})
		new Fred.Layer('background')
		Fred.active_layer = Fred.layers.first()
		$C = Fred.active_layer.canvas
		Fred.observe('mousemove',Fred.on_mousemove)
		Fred.observe('touchmove',Fred.on_touchmove)
		Fred.observe('touchstart',Fred.on_touchstart)
		Fred.observe('touchend',Fred.on_touchend)
		Fred.element.style.position = 'absolute'
		Fred.element.style.top = 0
		Fred.element.style.left = 0
		Fred.resize(Fred.width,Fred.height)
		setInterval(Fred.draw.bind(this),30)
	},
	resize: function(width,height) {
		if (width[width.length-1] == '%') Fred.width = parseInt(document.viewport.getWidth()*100/width.substr(0,width.length-1))
		else Fred.width = width
		if (height[height.length-1] == '%') Fred.height = parseInt(document.viewport.getHeight()*100/height.substr(0,height.length-1))
		else Fred.height = height
		Fred.element.style.width = width
		Fred.element.style.height = height
		Fred.layers.each(function(layer){
			layer.element.width = Fred.width
			layer.element.height = Fred.height
		})
	},
	on_mouseup: function(event) {
		Fred.drag = false
	},
	on_mousedown: function(event) {
		Fred.drag = true
	},
	on_mousemove: function(event) {
		Fred.pointer_x = Event.pointerX(event)
		Fred.pointer_y = Event.pointerY(event)
		Fred.draw()
	},
	on_touchstart: function(event) {
		console.log('touch!!')
		event.preventDefault()
		Fred.drag = true
	},
	on_touchmove: function(event) {
		event.preventDefault()
		Fred.pointer_x = event.touches[0].pageX
		Fred.pointer_y = event.touches[0].pageY
	},
	on_touchend: function(event) {
		event.preventDefault()
		Fred.drag = false
	},
	select_tool: function(tool) {
		console.log(tool)
		if (Fred.active_tool) Fred.active_tool.deselect()
		Fred.active_tool = Fred.tools[tool]
		Fred.active_tool.select()
		events = [	'on_mousedown',
				'on_mousemove',
				'on_mouseup',
				'dblclick',
				'on_touchstart',
				'on_touchmove',
				'on_touchend',
				'on_gesturestart',
				'on_gestureend']
	},
	move: function(object,x,y,absolute) {
		if (object.move) {
			object.move(x,y,absolute)
		} else if (object instanceof Fred.Polygon || object instanceof Fred.Group) {
			object.points.each(function(point){
				if (absolute) {
					point.x = x
					point.y = y
				} else {
					point.x += x
					point.y += y
				}
			},this)
		}
	},
	observe: function(a,b,c) {
		Fred.element.observe(a,b,c)
	},
	fire: function(a,b,c) {
		Fred.element.fire(a,b,c)
	},
	stop_observing: function(a,b,c) {
		Fred.element.stopObserving(a,b,c)
	},
	draw: function() {
		Fred.fire('fred:predraw')
		Fred.timestamp = Fred.date.getTime()
		Fred.times.unshift(Fred.timestamp)
		if (Fred.times.length > 100) Fred.times.pop()
		Fred.fps = parseInt(Fred.times.length/(Fred.timestamp - Fred.times.last())*1000)
		Fred.date = new Date
		this.layers.each(function(layer){layer.draw()})
		Fred.fire('fred:postdraw')
		fillStyle('red')
		rect(10,10,20,20)
	}
}

Fred.Layer = Class.create({
	initialize: function(name,args) {
		Fred.layers.push(this)
		Fred.element.insert("<canvas style='position:absolute;top:0;left:0;' id='"+name+"'></canvas>")
		this.name = name
		this.static = ''
		this.active = false
		this.objects = []
		this.element = $(this.name)
		this.element.onselectstart = function() {return false}
		this.element.width = Fred.width
		this.element.height = Fred.height
		this.canvas = $(name).getContext('2d')
		Object.extend(this,args)
		strokeStyle('#222')
		fillStyle('#eee')
	},
	draw: function() {
		$C = this.canvas
		clear()
		if (this.last_draw != Fred.timestamp) {
			this.last_draw = Fred.timestamp
			this.objects.each(function(object){
				object.draw()
			})
		}
	}
})

Fred.Point = Class.create({
	initialize: function(x,y) {
		this.x = x
		this.y = y
		this.bezier = new Array
		this.bezier[0] = false // first bezier point, optional
		this.bezier[1] = false // second bezier point, optional
	},
	add_bezier: function(x,y) {
		this.bezier.push([x,y])
		if (this.bezier.length > 2) this.bezier.splice(0,1)
	},
	is_bezier: function() {
		if (this.bezier.length > 0) return true
		else return false
	}
})
Fred.Polygon = Class.create({
	initialize: function(points) {
		this.point_size = 12
		if (points) this.points = points
		else this.points = []
		this.selected = true
		this.x = 0
		this.y = 0
	},
	name: 'untitled polygon',
	style: {
		fill: '#ccf',
		stroke: '#002'
	},
	apply_style: function() {
		lineWidth(2)
	},
	refresh: function() {
		centroid = Fred.Geometry.poly_centroid(this.points)
		this.x = centroid[0]
		this.y = centroid[1]
	},
	in_point: function() {
		if (this.points) {
			var in_point = false
			this.points.each(function(point) {
				if (Fred.Geometry.distance(Fred.pointer_x,Fred.pointer_y,point.x,point.y) < this.point_size) in_point = point
			},this)
			return in_point
		} else  {
			return false
		}
	},
	draw: function() {
		if (this.points && this.points.length > 0) {
			this.apply_style()
			var over_point = false
			beginPath()
			moveTo(this.points[0].x,this.points[0].y)
			this.points.each(function(point){
				lineTo(point.x,point.y)
			},this)
			if (this.closed) {
				lineTo(this.points[0].x,this.points[0].y)
				fillStyle(this.style.fill)
				fill()
			}
			if (this.style.stroke) stroke(this.style.stroke)

			this.points.each(function(point){
				save()
				opacity(0.2)
				if (Fred.Geometry.distance(Fred.pointer_x,Fred.pointer_y,point.x,point.y) < this.point_size) {
					opacity(0.4)
					over_point = true
					fillStyle('#22a')
					rect(point.x-this.point_size/2,point.y-this.point_size/2,this.point_size,this.point_size)
				} else if (this.selected) {
					strokeStyle('#22a')
					strokeRect(point.x-this.point_size/2,point.y-this.point_size/2,this.point_size,this.point_size)
				}
				restore()
			},this)
		}
	}
})

Fred.Tool = Class.create({
	initialize: function(description,args){
		this.description = description
		Object.extend(this,args)
	},
	on_select: function() {

	}
})

Fred.tools.select = new Fred.Tool('select & manipulate objects',{
	deselect: function() {
		Fred.stop_observing('dblclick',this.on_dblclick)
		Fred.stop_observing('mousedown',this.on_mousedown)
		Fred.stop_observing('mousemove',this.on_mousemove)
		Fred.stop_observing('mouseup',this.on_mouseup)
		Fred.stop_observing('touchstart',this.on_touchstart)
		Fred.stop_observing('touchend',this.on_touchend)
		Fred.stop_observing('fred:postdraw',this.draw)
	},
	select: function() {
		Fred.observe('dblclick',this.on_dblclick.bindAsEventListener(this))
		Fred.observe('mousedown',this.on_mousedown.bindAsEventListener(this))
		Fred.observe('mousemove',this.on_mousemove.bindAsEventListener(this))
		Fred.observe('mouseup',this.on_mouseup.bindAsEventListener(this))
		Fred.observe('touchstart',this.on_touchstart.bindAsEventListener(this))
		Fred.observe('touchend',this.on_touchend.bindAsEventListener(this))
		Fred.observe('fred:postdraw',this.draw.bindAsEventListener(this))

	},
	on_dblclick: function() {

	},
	on_mousedown: function() {
		this.selected_object = false
		Fred.active_layer.objects.each(function(object){
			var selectables = [Fred.Polygon,Fred.Group]
			if (object instanceof Fred.Polygon || object instanceof Fred.Group) {
				if (Fred.Geometry.is_point_in_poly(object.points,Fred.pointer_x,Fred.pointer_y)) {
					this.selected_object = object
					this.selected_object_x = object.x
					this.selected_object_y = object.y
					this.click_x = Fred.pointer_x
					this.click_y = Fred.pointer_y
				}
			}
		},this)
	},
	on_mousemove: function() {
		if (this.selected_object && Fred.drag) {
			var x = this.selected_object_x + Fred.pointer_x - this.click_x
			var y = this.selected_object_y + Fred.pointer_y - this.click_y
			Fred.move(this.selected_object,x,y,true)
		}
	},
	on_mouseup: function() {
		if (this.selected_object && Fred.drag) {
			this.selected_object.refresh()
			this.selected_object = false
		}
	},
	on_touchstart: function(event) {
		this.on_mousedown(event)
	},
	on_touchmove: function(event) {
		this.on_mousemove(event)
	},
	on_touchend: function(event) {
		this.on_mouseup(event)
	},
	draw: function() {

	}
})
Fred.tools.pen = new Fred.Tool('draw polygons',{
	polygon: false,
	dragging_point: false,
	creating_bezier: false,
	keys: $H({
		'esc': function() { this.complete_polygon() }
	}),
	deselect: function() {
		Fred.stop_observing('dblclick',this.on_dblclick)
		Fred.stop_observing('mousedown',this.on_mousedown)
		Fred.stop_observing('mousemove',this.on_mousemove)
		Fred.stop_observing('mouseup',this.on_mouseup)
		Fred.stop_observing('touchstart',this.on_touchstart)
		Fred.stop_observing('touchend',this.on_touchend)
		Fred.stop_observing('fred:postdraw',this.draw)
	},
	select: function() {
		Fred.observe('dblclick',this.on_dblclick.bindAsEventListener(this))
		Fred.observe('mousedown',this.on_mousedown.bindAsEventListener(this))
		Fred.observe('mousemove',this.on_mousemove.bindAsEventListener(this))
		Fred.observe('mouseup',this.on_mouseup.bindAsEventListener(this))
		Fred.observe('touchstart',this.on_touchstart.bindAsEventListener(this))
		Fred.observe('touchend',this.on_touchend.bindAsEventListener(this))
		Fred.observe('fred:postdraw',this.draw.bindAsEventListener(this))

		Fred.keys.load(this.keys)
	},
	on_mousedown: function() {
		if (this.polygon) {
			this.clicked_point = this.polygon.in_point()
			if (this.clicked_point != false && this.clicked_point != this.polygon.points[0]) {
				if (false) {
					this.creating_bezier = true
				} else {
					this.dragging_point = true
				}
			} else {
				var on_final = (this.polygon.points.length > 0 && ((Math.abs(this.polygon.points[0].x - Fred.pointer_x) < Fred.click_radius) && (Math.abs(this.polygon.points[0].y - Fred.pointer_y) < Fred.click_radius)))
				if (on_final && this.polygon.points.length > 1) {
					this.polygon.closed = true
					this.complete_polygon()
				} else if (!on_final) this.polygon.points.push(new Fred.Point(Fred.pointer_x,Fred.pointer_y))
			}
		} else {
			this.polygon = new Fred.Polygon
		}
	},
	on_dblclick: function() {
		if (this.polygon && this.polygon.points.length > 1) {
			this.complete_polygon()
		}
	},
	on_mousemove: function() {
		if (this.dragging_point) {
			this.clicked_point.x = Fred.pointer_x
			this.clicked_point.y = Fred.pointer_y
		}
	},
	on_mouseup: function() {
		this.dragging_point = false
	},
	on_touchstart: function(e) {
		this.on_mousedown(e)
	},
	on_touchend: function(e) {
		this.on_mouseup(e)
	},
	draw: function() {
		if (this.polygon) this.polygon.draw()
	},
	complete_polygon: function() {
		Fred.active_layer.objects.push(this.polygon)
		this.polygon.refresh()
		this.polygon = false
		Fred.stop_observing('fred:postdraw',this.draw)
	}
})


Fred.Geometry = {
	distance: function(x1,y1,x2,y2) {
		return Math.sqrt(Math.pow(Math.abs(x1-x2),2) + Math.pow(Math.abs(y1-y2),2))
	},
	is_point_in_poly: function(poly, x, y){
	    for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
	        ((poly[i].y <= y && y < poly[j].y) || (poly[j].y <= y && y < poly[i].y))
	        && (x < (poly[j].x - poly[i].x) * (y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
	        && (c = !c);
	    return c;
	},
	poly_centroid: function(polygon) {
		var n = polygon.length
		var cx = 0, cy = 0
		var a = Fred.Geometry.poly_area(polygon,true)
		var centroid = []
		var i,j
		var factor = 0

		for (i=0;i<n;i++) {
			j = (i + 1) % n
			factor = (polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y)
			cx += (polygon[i].x + polygon[j].x) * factor
			cy += (polygon[i].y + polygon[j].y) * factor
		}

		a *= 6
		factor = 1/a
		cx *= factor
		cy *= factor
		centroid[0] = cx
		centroid[1] = cy
		return centroid
	},
        poly_area: function(points, signed) {
                var area = 0
                points.each(function(point,index) {
                        if (index < point.length-1) next = points[index+1]
                        else next = points[0]
                        if (index > 0) last = points[index-1]
                        else last = points[points.length-1]
                        area += last.x*point.y-point.x*last.y+point.x*next.y-next.x*point.y
                })
                if (signed) return area/2
                else return Math.abs(area/2)
        }
}

Fred.keys = {
	add: function(a,b,c) {
		shortcut.add(a,b,c)
	},
	remove: function(a) {
		shortcut.remove(a)
	},
	load: function(set) {
		Fred.keys.clear()
		Fred.keys.current = set
		Fred.keys.current.keys().each(function(key){
			Fred.keys.add(key,Fred.keys.current.get(key))
		},this)
	},
	load_master: function() {
		Fred.keys.master.keys().each(function(key){
			Fred.keys.add(key,Fred.keys.master.get(key))
		},this)
	},
	clear: function() {
		Fred.keys.current.keys().each(function(key){
			Fred.keys.remove(key)
		},this)
	},
	defaults: {
	},
	master: $H({
		's': function(){ Fred.select_tool('select') },
		'p': function(){ Fred.select_tool('pen') },
	}),
	current: $H({

	})
}

Fred.keys.load_master()


