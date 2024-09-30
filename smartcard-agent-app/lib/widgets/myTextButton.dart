import 'package:flutter/material.dart';
import 'package:hexcolor/hexcolor.dart';

Widget myTextButton(String content, void Function() handler) {
  return InkWell(
      customBorder: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      onTap: handler,
      child: Wrap(children: [
        Container(
            padding: const EdgeInsets.fromLTRB(6, 5, 6, 5),
            decoration: BoxDecoration(
              color: HexColor('E8F3FF'),
              borderRadius: BorderRadius.circular(5),
            ),
            child: Text(content,
              style: TextStyle(fontSize: 14, fontFamily: 'Pretendard', color: HexColor('3182F6'), fontWeight: FontWeight.w600),))
      ],
      )
  );
}