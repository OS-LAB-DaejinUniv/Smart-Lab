import 'package:flutter/material.dart';
import 'package:hexcolor/hexcolor.dart';

Widget mainMenuEntry(String emoji, String title, String desc, void Function() handler) {
  return InkWell(
      customBorder: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
    onTap: () {
      handler();
    },
    child: Container(
        height: 48,
        padding: const EdgeInsets.fromLTRB(3, 0, 3, 0),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(children: [
          Expanded(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                      padding: const EdgeInsets.fromLTRB(0, 8, 0, 0),
                      margin: const EdgeInsets.fromLTRB(0, 0, 11, 0),
                      height: 40,
                      width: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: HexColor('F2F4F6'),
                        borderRadius:
                        BorderRadius.circular(8),
                      ),
                      child: Text(
                          emoji,
                          style: const TextStyle(
                              fontFamily: 'TossFace',
                              fontSize: 29))),
                  Column(
                    crossAxisAlignment:
                    CrossAxisAlignment.start,
                    mainAxisAlignment:
                    MainAxisAlignment.center,
                    children: [
                      Text(
                          title,
                          style: const TextStyle(
                              color: Colors.black87,
                              fontSize: 18,
                              fontWeight: FontWeight.w600)),
                      Text(
                          desc,
                          style: const TextStyle(
                              color: Colors.black54,
                              fontSize: 14,
                              fontWeight: FontWeight.w500))
                    ],
                  )
                ],
              ))
        ]))
  );

}