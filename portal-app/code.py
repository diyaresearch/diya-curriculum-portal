# import asyncio
# import board
# import rp2pio
# import adafruit_pioasm
# import time
# import array
# from digitalio import DigitalInOut, Direction
# from microcontroller import Pin
# from pwmio import PWMOut

# program = adafruit_pioasm.assemble("""
# .program arinc429
# .side_set 1 opt
# .wrap_target
# set x, 31           side 0
# bitloop:
#     out pins, 1     side 0
#     jmp x-- bitloop side 1
# set pins, 0         side 0
# .wrap
# """)

# program_in = adafruit_pioasm.assemble("""
# .program arinc429_in
# .side_set 1 opt
# .wrap_target
# set x, 31
# wait 1 pin 0
# bitloop:
#     in pins, 1
#     jmp x-- bitloop
# .wrap
# """)

# def as_in(pin: Pin) -> DigitalInOut:
#     x = DigitalInOut(pin)
#     x.direction = Direction.INPUT
#     return x


# def as_out(pin: Pin) -> DigitalInOut:
#     x = DigitalInOut(pin)
#     x.direction = Direction.OUTPUT
#     return x


# class SoftwareArincTxDriver1:
#     def __init__(
#         self, tx: Pin, clocking: Pin, direction: Optional[Pin], *, freq: int = 12_800
#     ):
#         self._tx = as_out(tx)
#         self._clocking = as_out(clocking)
#         if direction:
#             as_out(direction).value = True
#         self._freq = freq
#         self._queue = []
#         self._running = True
#         self.task = asyncio.create_task(self._loop())

#     def send(self, message: bytes) -> None:
#         assert len(message) == 4
#         self._queue.append(message)

#     def stop(self) -> None:
#         self._running = False

#     async def _loop(self):
#         delay = 0.5 / self._freq
#         while self._running:
#             if not self._queue:
#                 await asyncio.sleep(0.001)
#                 continue
#             message = self._queue.pop()
#             for b in message:
#                 for i in range(0, 8):
#                     self._tx.value = bool(b & (0x80 >> i))
#                     self._clocking.value = True
#                     time.sleep(delay)
#                     self._clocking.value = False
#                     time.sleep(delay)
#             self._tx.value = False

# class SoftwareArincTxDriver2:
#     def __init__(
#         self, tx: Pin, clocking: Pin, direction: Optional[Pin], *, freq: int = 100000
#     ):
#         self._tx = as_out(tx)
#         self._clocking = PWMOut(clocking, frequency=235, variable_frequency=True)
#         if direction:
#             as_out(direction).value = True
#         self._freq = freq
#         self._queue = []
#         self._running = True
#         self.task = asyncio.create_task(self._loop())

#     def send(self, message: bytes) -> None:
#         assert len(message) == 4
#         self._queue.append(message)

#     def stop(self) -> None:
#         self._running = False

#     async def _loop(self):
#         delay = 0.5 / self._freq
#         while self._running:
#             if not self._queue:
#                 await asyncio.sleep(0.001)
#                 continue
#             message = self._queue.pop()
#             self._clocking.duty_cycle = int(65535 * 0.5)  # On
#             for b in message:
#                 for _ in range(0, 8):
#                     self._tx.value = bool(b & 0x80)
#                     b <<= 1
#                     time.sleep(delay)
#             self._clocking.duty_cycle = 0  # Off
#             self._tx.value = False


# class ArincTxDriver:
#     def __init__(
#         self, tx: Pin, clocking: Pin, direction: Optional[Pin], *, freq: int = 12800
#     ):
#         self._sm = rp2pio.StateMachine(
#             program,
#             frequency=freq * 2,
#             first_out_pin=tx,
#             first_set_pin=tx,
#             first_sideset_pin=clocking,
#             out_pin_count=1,
#             set_pin_count=1,
#             sideset_pin_count=1,
#             sideset_enable=True,
#             out_shift_right=False,  # Start pulling out most sigificant bits first
#             auto_pull=True,
#             pull_threshold=32,  # Make sure we pull 32 bits
#         )

#     def send(self, data: int) -> None:
#         self._sm.write(array.array('I', (data, )))

# class SoftwareArincRxDriver:
#     def __init__(
#         self,
#         rx: board.Pin,
#         clocking: board.Pin,
#         direction: Optional[board.Pin],
#         callback,
#     ):
#         self._rx = as_in(rx)
#         self._clocking = as_in(clocking)
#         self._freq = freq
#         self._running = True
#         self.task = asyncio.create_task(self._loop())

#     def stop(self) -> None:
#         self._running = False

#     async def _loop(self):
#         bit = 0
#         byte = 0
#         buffer = b"\0" * 4
#         while self._running:
#             if not self._clocking.value:
#                 await asyncio.sleep(0)
#             # TODO

# class ArincRxDriver:
#     def __init__(self,
#         rx: board.Pin,
#         clocking: board.Pin,
#         callback,
#         freq:int=100_000,
#     ):
#         self._sm = rp2pio.StateMachine(
#             program_in,
#             frequency=freq * 2,
#             first_in_pin=rx,
#             first_sideset_pin=clocking,
#             in_pin_count=1,
#             sideset_pin_count=1,
#             sideset_enable=True,
#             in_shift_right=False,  # Start pulling out most sigificant bits first
#             auto_push=True,
#             push_threshold=32,  # Make sure we pull 32 bits
#         )
#         self._cb = callback
#         self._running = True
#         self._task = asyncio.create_task(self._loop())

#     def stop(self):
#         self._running = False

#     async def _loop(self):
#         buffer = bytearray()
#         while self._running:
#             if self._sm.in_waiting:
#                 self._sm.readinto(buffer)
#                 print(f"--> {buffer}")
#             await asyncio.sleep(0)

# def received(data):
#     print(data)

# def reverse_packet(x):
#     out = 0
#     for i in range(32):
#         if x & (1 << i):
#             out |= 1 << (31 - i)
#     return out

# async def main():
#     port_a = ArincTxDriver(board.D13, board.D12, board.D11)
#     #port_b = ArincRxDriver(board.D10, board.D9, received)
#     while True:
#         #print("Writing")
#         # port_a.send(0b10010001100011000100010000001101)
#         port_a.send(reverse_packet(0b10010001100011000100010000001101))
#         #port_a.send(0b11100010111111111111111111111111 & 0xffffffff)
#         # port_a.send(0b10101111111111111111111111111111)
#         await asyncio.sleep(0.002)


# asyncio.run(main())


import time
import board
import busio
import adafruit_gps

# Set up UART (change pins if needed)
uart = busio.UART(board.D0, board.D1, baudrate=9600, timeout=10)

# Set up GPS module
gps = adafruit_gps.GPS(uart, debug=False)

# Send command to GPS to output all NMEA sentences
gps.send_command(b'PMTK220,1000')  # Update once per second
gps.send_command(b'PMTK314,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0')  # Enable RMC and GGA only

last_print = time.monotonic()

while True:
    gps.update()
    
    current = time.monotonic()
    if current - last_print >= 1.0:
        last_print = current

        if not gps.has_fix:
            print("Waiting for fix...")
            continue

        # Once we have a fix, print details
        print("=" * 40)
        print(f"Fix timestamp: {gps.timestamp_utc}")
        print(f"Latitude: {gps.latitude:.6f}")
        print(f"Longitude: {gps.longitude:.6f}")
        print(f"Altitude: {gps.altitude_m:.2f} m")
        print(f"Speed: {gps.speed_knots:.2f} knots")
        print(f"Satellites: {gps.satellites}")
