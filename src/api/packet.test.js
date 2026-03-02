import { buffer_reader, buffer_writer, make_batch } from './packet';

describe('make_batch', () => {
  const dummy_types = {
    dummy1: {
      code: 0x10,
      read: reader => ({ val: reader.read8() }),
      size: 1,
      write: (writer, packet) => writer.write8(packet.val)
    },
    dummy2: {
      code: 0x20,
      read: reader => ({ str: reader.read_str() }),
      size: packet => 1 + packet.str.length,
      write: (writer, packet) => writer.write_str(packet.str)
    }
  };

  const get_types = () => dummy_types;
  const batch_type = make_batch(get_types);

  it('calculates the correct size', () => {
    const packets = [
      { type: dummy_types.dummy1, packet: { val: 42 } },
      { type: dummy_types.dummy2, packet: { str: 'abc' } }
    ];
    // Size should be:
    // 2 bytes for the packet count (UInt16)
    // Packet 1: 1 byte for code (0x10) + 1 byte for val = 2 bytes
    // Packet 2: 1 byte for code (0x20) + 1 byte for str length + 3 bytes for 'abc' = 5 bytes
    // Total: 2 + 2 + 5 = 9 bytes
    expect(batch_type.size(packets)).toBe(9);
  });

  it('writes and reads a batch of packets', () => {
    const packets = [
      { type: dummy_types.dummy1, packet: { val: 42 } },
      { type: dummy_types.dummy2, packet: { str: 'abc' } }
    ];

    const writer = new buffer_writer(9);
    batch_type.write(writer, packets);

    // Verify written buffer structure
    const buf = new Uint8Array(writer.result);
    // [0]: count lower byte (2), [1]: count upper byte (0)
    expect(buf[0]).toBe(2);
    expect(buf[1]).toBe(0);
    // [2]: code for dummy1 (0x10)
    expect(buf[2]).toBe(0x10);
    // [3]: val for dummy1 (42)
    expect(buf[3]).toBe(42);
    // [4]: code for dummy2 (0x20)
    expect(buf[4]).toBe(0x20);
    // [5]: str length (3)
    expect(buf[5]).toBe(3);
    // [6-8]: 'a', 'b', 'c' (97, 98, 99)
    expect(buf[6]).toBe(97);
    expect(buf[7]).toBe(98);
    expect(buf[8]).toBe(99);

    const reader = new buffer_reader(writer.result);
    const result = batch_type.read(reader);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: dummy_types.dummy1, packet: { val: 42 } });
    expect(result[1]).toEqual({ type: dummy_types.dummy2, packet: { str: 'abc' } });
  });

  it('handles an empty batch', () => {
    const packets = [];
    expect(batch_type.size(packets)).toBe(2); // 2 bytes for count

    const writer = new buffer_writer(2);
    batch_type.write(writer, packets);

    const reader = new buffer_reader(writer.result);
    const result = batch_type.read(reader);

    expect(result).toEqual([]);
  });
});

describe('buffer_writer', () => {
  it('initializes correctly with length', () => {
    const writer = new buffer_writer(10);
    expect(writer.buffer).toBeInstanceOf(Uint8Array);
    expect(writer.buffer.byteLength).toBe(10);
    expect(writer.pos).toBe(0);
  });

  it('result returns the underlying ArrayBuffer', () => {
    const writer = new buffer_writer(5);
    expect(writer.result).toBeInstanceOf(ArrayBuffer);
    expect(writer.result.byteLength).toBe(5);
  });

  describe('write8', () => {
    it('writes an 8-bit integer and advances position', () => {
      const writer = new buffer_writer(2);
      expect(writer.write8(0x42)).toBe(writer);
      expect(writer.pos).toBe(1);
      expect(writer.buffer[0]).toBe(0x42);
      writer.write8(0x13);
      expect(writer.pos).toBe(2);
      expect(writer.buffer[1]).toBe(0x13);
    });
  });

  describe('write16', () => {
    it('writes a 16-bit integer (little-endian) and advances position', () => {
      const writer = new buffer_writer(2);
      expect(writer.write16(0x3412)).toBe(writer);
      expect(writer.pos).toBe(2);
      expect(writer.buffer[0]).toBe(0x12);
      expect(writer.buffer[1]).toBe(0x34);
    });
  });

  describe('write32', () => {
    it('writes a 32-bit integer (little-endian) and advances position', () => {
      const writer = new buffer_writer(4);
      expect(writer.write32(0x78563412)).toBe(writer);
      expect(writer.pos).toBe(4);
      expect(writer.buffer[0]).toBe(0x12);
      expect(writer.buffer[1]).toBe(0x34);
      expect(writer.buffer[2]).toBe(0x56);
      expect(writer.buffer[3]).toBe(0x78);
    });
  });

  describe('write_str', () => {
    it('writes length-prefixed string and advances position', () => {
      const writer = new buffer_writer(6);
      expect(writer.write_str('hello')).toBe(writer);
      expect(writer.pos).toBe(6);
      expect(writer.buffer[0]).toBe(5); // length
      expect(writer.buffer[1]).toBe(104); // h
      expect(writer.buffer[2]).toBe(101); // e
      expect(writer.buffer[3]).toBe(108); // l
      expect(writer.buffer[4]).toBe(108); // l
      expect(writer.buffer[5]).toBe(111); // o
    });
  });

  describe('rest', () => {
    it('writes raw Uint8Array and advances position', () => {
      const writer = new buffer_writer(4);
      const data = new Uint8Array([10, 20, 30]);
      expect(writer.rest(data)).toBe(writer);
      expect(writer.pos).toBe(3);
      expect(writer.buffer[0]).toBe(10);
      expect(writer.buffer[1]).toBe(20);
      expect(writer.buffer[2]).toBe(30);
    });
  });

  describe('write_buf', () => {
    it('writes size-prefixed Uint8Array and advances position', () => {
      const writer = new buffer_writer(7);
      const data = new Uint8Array([10, 20, 30]);
      expect(writer.write_buf(data)).toBe(writer);
      expect(writer.pos).toBe(7);
      // 4 bytes size (little-endian for 3)
      expect(writer.buffer[0]).toBe(3);
      expect(writer.buffer[1]).toBe(0);
      expect(writer.buffer[2]).toBe(0);
      expect(writer.buffer[3]).toBe(0);
      // Data
      expect(writer.buffer[4]).toBe(10);
      expect(writer.buffer[5]).toBe(20);
      expect(writer.buffer[6]).toBe(30);
    });
  });
});

describe('buffer_reader', () => {
  it('initializes correctly with an ArrayBuffer', () => {
    const buffer = new ArrayBuffer(10);
    const reader = new buffer_reader(buffer);
    expect(reader.buffer).toBeInstanceOf(Uint8Array);
    expect(reader.buffer.byteLength).toBe(10);
    expect(reader.pos).toBe(0);
  });

  it('initializes correctly with a Uint8Array', () => {
    const buffer = new Uint8Array(10);
    const reader = new buffer_reader(buffer);
    expect(reader.buffer).toBe(buffer);
    expect(reader.buffer.byteLength).toBe(10);
    expect(reader.pos).toBe(0);
  });

  it('done() returns true when position is at byteLength', () => {
    const buffer = new Uint8Array(1);
    const reader = new buffer_reader(buffer);
    expect(reader.done()).toBe(false);
    reader.pos = 1;
    expect(reader.done()).toBe(true);
  });

  describe('read8', () => {
    it('reads a byte and advances position', () => {
      const buffer = new Uint8Array([0x42, 0x13]);
      const reader = new buffer_reader(buffer);
      expect(reader.read8()).toBe(0x42);
      expect(reader.pos).toBe(1);
      expect(reader.read8()).toBe(0x13);
      expect(reader.pos).toBe(2);
    });

    it('throws error if buffer is too small', () => {
      const reader = new buffer_reader(new Uint8Array(0));
      expect(() => reader.read8()).toThrow('packet too small');
    });
  });

  describe('read16', () => {
    it('reads a 16-bit integer (little-endian) and advances position', () => {
      const buffer = new Uint8Array([0x12, 0x34]);
      const reader = new buffer_reader(buffer);
      expect(reader.read16()).toBe(0x3412);
      expect(reader.pos).toBe(2);
    });

    it('throws error if buffer is too small', () => {
      const reader = new buffer_reader(new Uint8Array(1));
      expect(() => reader.read16()).toThrow('packet too small');
    });
  });

  describe('read32', () => {
    it('reads a 32-bit integer (little-endian) and advances position', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const reader = new buffer_reader(buffer);
      expect(reader.read32()).toBe(0x78563412);
      expect(reader.pos).toBe(4);
    });

    it('throws error if buffer is too small', () => {
      const reader = new buffer_reader(new Uint8Array(3));
      expect(() => reader.read32()).toThrow('packet too small');
    });
  });

  describe('read_str', () => {
    it('reads a length-prefixed string and advances position', () => {
      // 5 bytes string "hello"
      const buffer = new Uint8Array([5, 104, 101, 108, 108, 111]);
      const reader = new buffer_reader(buffer);
      expect(reader.read_str()).toBe('hello');
      expect(reader.pos).toBe(6);
    });

    it('throws error if length byte is missing', () => {
      const reader = new buffer_reader(new Uint8Array(0));
      expect(() => reader.read_str()).toThrow('packet too small');
    });

    it('throws error if string data is incomplete', () => {
      const buffer = new Uint8Array([5, 104, 101, 108]); // Length 5, but only 3 bytes of data
      const reader = new buffer_reader(buffer);
      expect(() => reader.read_str()).toThrow('packet too small');
    });
  });

  describe('read_buf', () => {
    it('reads a size-prefixed buffer and advances position', () => {
      // 4 bytes length (little-endian for 3), followed by 3 bytes of data
      const buffer = new Uint8Array([3, 0, 0, 0, 10, 20, 30]);
      const reader = new buffer_reader(buffer);
      const result = reader.read_buf();
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(3);
      expect(result[0]).toBe(10);
      expect(result[1]).toBe(20);
      expect(result[2]).toBe(30);
      expect(reader.pos).toBe(7);
    });

    it('throws error if size header is incomplete', () => {
      const reader = new buffer_reader(new Uint8Array([3, 0, 0])); // Only 3 bytes for size
      expect(() => reader.read_buf()).toThrow('packet too small');
    });

    it('throws error if buffer data is incomplete', () => {
      const buffer = new Uint8Array([5, 0, 0, 0, 10, 20]); // Length 5, but only 2 bytes of data
      const reader = new buffer_reader(buffer);
      expect(() => reader.read_buf()).toThrow('packet too small');
    });
  });
});
