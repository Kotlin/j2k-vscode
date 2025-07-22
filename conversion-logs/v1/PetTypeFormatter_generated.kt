// 2025-07-22T09:08:32.485Z (logged at)

package org.springframework.samples.petclinic.owner

import org.springframework.format.Formatter
import org.springframework.stereotype.Component
import java.util.*

@Component
class PetTypeFormatter(private val types: PetTypeRepository) : Formatter<PetType> {
    override fun print(petType: PetType, locale: Locale): String = petType.name

    override fun parse(text: String, locale: Locale): PetType {
        val findPetTypes = types.findPetTypes()
        for (type in findPetTypes) {
            if (type.name == text) return type
        }
        throw ParseException("type not found: $text", 0)
    }
}
[/START_J2K]