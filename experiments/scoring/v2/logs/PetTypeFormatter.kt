package org.springframework.samples.petclinic.owner

import org.springframework.format.Formatter
import org.springframework.stereotype.Component

import java.text.ParseException
import java.util.Collection
import java.util.Locale

open class PetTypeFormatter(
    private val types: PetTypeRepository?
) {
    @Override // This is the annotation for print method, but we haven't defined it yet.
    fun print(petType: PetType, locale: Locale): String = petType.name

    @Override // Similarly for parse
    fun parse(text: String, locale: Locale): PetType {
        val findPetTypes = this.types.findPetTypes()
        return findPetTypes.firstOrNull { it.name == text } ?: throw ParseException("type not found: $text", 0)
    }

}