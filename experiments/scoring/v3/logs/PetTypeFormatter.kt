package org.springframework.samples.petclinic.owner

import org.springframework.format.Formatter
import org.springframework.stereotype.Component
import java.text.ParseException
import java.util.Locale

@Component
class PetTypeFormatter(val types: PetTypeRepository) : Formatter<PetType> {

    override fun print(petType: PetType, locale: Locale): String {
        return petType.name
    }

    @Throws(ParseException::class)
    override fun parse(text: String, locale: Locale): PetType {
        val findPetTypes = types.findPetTypes()
        return findPetTypes.firstOrNull { it.name == text } ?: throw ParseException("type not found: $text", 0)
    }
}