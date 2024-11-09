import binascii

# ===================================================================
aes_key = '00112233445566778899AABBCCDDEEFF' # fill this with your AES-128 key
# ===================================================================

name = input('Name: ')
name_bytes = bytes(name, 'utf-8')

student_no = input('Student ID number: ')
student_no_bytes = bytes(student_no, 'utf-8')

name_hexstr = binascii.hexlify(name_bytes).decode('ascii').upper().ljust(32, '0')
student_no_hexstr = binascii.hexlify(student_no_bytes).decode('ascii').upper().ljust(32, '0')

# check payload size
if len(aes_key) != 32:
    print('length of AES-128 key must be 16 bytes.')
    quit()
    
if len(student_no_hexstr) != 32:
    print('length of student number can\'t be longer than 16 bytes.')
    quit()

if len(name_hexstr) != 32:
    print('length of name can\'t be longer than 16 bytes.')
    quit()

print('Use this parameter at applet installation.')
print(aes_key + name_hexstr + student_no_hexstr)
