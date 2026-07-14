# ZorixScript Guide

ZorixScript is the built-in behaviour language for Zorix Engine.

## How To Use

1. Select an object.
2. In Inspector, set Behaviour to `zorixscript`.
3. Edit Script Source.
4. Press Play.

## Blocks

```zorixscript
start:
  log hello
  color #44aaff

update:
  spin y 1.2
```

`start:` runs once. `update:` runs every frame.

## Movement

```zorixscript
update:
  move 0 0 1
  spin y 1.2
  rotateBy 0 1 0
  sway x 1.4 0.9
  bob 0.8 1
  orbit 0.7 3
  pulse 0.15
```

## Keyboard Input

```zorixscript
update:
  ifkey w move 0 0 -3
  ifkey s move 0 0 3
  ifkey a move -3 0 0
  ifkey d move 3 0 0
  ifkey space velocity 0 5 0
```

## Variables And Conditions

```zorixscript
start:
  var timer 0
  var speed 2

update:
  add timer 1
  move speed 0 0
  ifvar timer > 3 color #ff3355
```

## Materials

```zorixscript
start:
  color #66ff99
  roughness 0.2
  metallic 0.8
  opacity 0.75
```

## Physics

```zorixscript
start:
  gravity on
  bounce 0.8
  velocity 0 5 0
```

## 3D And FX

```zorixscript
start:
  spawn cube 0 1 0
  spawn coin 1 0 0
  emit

update:
  camera follow 4 3 6
  camera look
  lookAtCamera
```

## Scene Object Control

```zorixscript
start:
  hide Zorix Tree
  show Player
  toggle Enemy
  disable Pickup Orb
  enable Pickup Orb
```

## Example: Tree Moving Left And Right

```zorixscript
update:
  sway x 1.3 0.8
  spin z 0.12
```

## Example: Player Controller

```zorixscript
start:
  gravity on
  bounce 0.1

update:
  ifkey w move 0 0 -4
  ifkey s move 0 0 4
  ifkey a move -4 0 0
  ifkey d move 4 0 0
  ifkey space velocity 0 5 0
  camera follow 4 3 6
  camera look
```

## Command List

- `var name value`
- `set name value`
- `add name value`
- `ifvar name > value command...`
- `ifkey key command...`
- `move x y z`
- `position x y z`
- `rotate x y z`
- `rotateBy x y z`
- `scale value`
- `scale3 x y z`
- `spin axis speed`
- `sway axis speed distance`
- `bob speed distance`
- `orbit speed radius`
- `pulse amount`
- `color #hex`
- `opacity value`
- `roughness value`
- `metallic value`
- `gravity on/off`
- `velocity x y z`
- `bounce value`
- `spawn type x y z`
- `emit`
- `hide object name`
- `show object name`
- `toggle object name`
- `enable object name`
- `disable object name`
- `camera follow x y z`
- `camera look`
- `lookAtCamera`
- `log message`
